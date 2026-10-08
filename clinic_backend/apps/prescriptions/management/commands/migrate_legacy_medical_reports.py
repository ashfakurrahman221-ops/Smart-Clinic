import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.prescriptions.models import MedicalReport
from apps.common.utils import parse_cloudinary_url

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Audits and safely migrates legacy public Cloudinary medical report assets "
        "to authenticated (private) storage. Defaults to DRY-RUN mode. "
        "Mutation requires the --execute flag."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--execute',
            action='store_true',
            help='Execute actual Cloudinary type conversion and database update. Defaults to False (Dry Run).',
        )
        parser.add_argument(
            '--report-id',
            type=str,
            help='Target a specific MedicalReport UUID for migration.',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=0,
            help='Limit the number of records to process (0 = all records).',
        )

    def handle(self, *args, **options):
        is_execute = options.get('execute', False)
        report_id = options.get('report_id')
        batch_size = options.get('batch_size', 0)

        mode_str = "EXECUTE (MUTATION ACTIVE)" if is_execute else "DRY-RUN (AUDIT ONLY - NO MUTATIONS)"
        self.stdout.write(self.style.NOTICE(f"\n=================================================="))
        self.stdout.write(self.style.NOTICE(f"HISTORICAL MEDICAL REPORT MIGRATION AUDIT"))
        self.stdout.write(self.style.NOTICE(f"MODE: {mode_str}"))
        self.stdout.write(self.style.NOTICE(f"==================================================\n"))

        qs = MedicalReport.objects.all().order_by('created_at')
        if report_id:
            qs = qs.filter(pk=report_id)
        if batch_size > 0:
            qs = qs[:batch_size]

        stats = {
            'scanned': 0,
            'already_secure': 0,
            'legacy_public': 0,
            'migrated': 0,
            'skipped': 0,
            'failed': 0,
            'unrecognized': 0,
        }

        for report in qs:
            stats['scanned'] += 1
            safe_id = f"report_{str(report.id)[:8]}..."

            if not report.file_url:
                stats['skipped'] += 1
                continue

            parsed = parse_cloudinary_url(report.file_url)
            if not parsed:
                # Non-Cloudinary or local test fixture URL
                stats['unrecognized'] += 1
                continue

            # Classify storage delivery type
            is_authenticated = '/authenticated/' in report.file_url
            if is_authenticated:
                stats['already_secure'] += 1
                continue

            # Detected legacy public asset (type="upload")
            stats['legacy_public'] += 1

            if not is_execute:
                # DRY RUN: do not modify remote storage or database
                continue

            # EXECUTE MODE: Attempt migration
            try:
                import cloudinary.uploader

                # Step 1: Move Cloudinary asset from upload to authenticated storage
                # and request CDN edge invalidation of the old public URL
                result = cloudinary.uploader.rename(
                    from_public_id=parsed['public_id'],
                    to_public_id=parsed['public_id'],
                    type='upload',
                    to_type='authenticated',
                    resource_type=parsed['resource_type'],
                    invalidate=True,
                    overwrite=True
                )

                # Step 2: Verify remote operation succeeded
                if not result or result.get('type') != 'authenticated':
                    raise ValueError(f"Remote conversion failed to produce authenticated type for {safe_id}")

                new_secure_url = result.get('secure_url') or result.get('url')
                if not new_secure_url or '/authenticated/' not in new_secure_url:
                    raise ValueError(f"Missing valid authenticated URL in Cloudinary response for {safe_id}")

                # Step 3: Atomic database update
                with transaction.atomic():
                    report.file_url = new_secure_url
                    report.save(update_fields=['file_url', 'updated_at'])

                stats['migrated'] += 1
                logger.info("Migrated legacy medical report to authenticated storage: %s", safe_id)

            except Exception as e:
                stats['failed'] += 1
                logger.error("Failed migrating legacy medical report %s: %s", safe_id, str(e))

        # Output Summary (Redacted - counts only)
        self.stdout.write(self.style.SUCCESS("\n--- MIGRATION AUDIT SUMMARY ---"))
        self.stdout.write(f"Scanned:        {stats['scanned']}")
        self.stdout.write(f"Already Secure: {stats['already_secure']}")
        self.stdout.write(f"Legacy Public:  {stats['legacy_public']}")
        self.stdout.write(f"Migrated:       {stats['migrated']}")
        self.stdout.write(f"Skipped:        {stats['skipped']}")
        self.stdout.write(f"Unrecognized:   {stats['unrecognized']}")
        self.stdout.write(f"Failed:         {stats['failed']}")

        if not is_execute:
            self.stdout.write(
                self.style.WARNING(
                    "\n[DRY RUN COMPLETED] Zero remote Cloudinary assets or database records were modified.\n"
                    "To execute actual migration, re-run with: python manage.py migrate_legacy_medical_reports --execute\n"
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS("\n[EXECUTION COMPLETED] Migration pass finished.\n"))

        return ""
