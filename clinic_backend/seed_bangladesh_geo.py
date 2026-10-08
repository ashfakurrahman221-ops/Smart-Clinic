import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.common.models import Division, District, Upazila

print("=== Seeding Bangladesh Geo-Hierarchy (8 Divisions, 64 Districts, Upazilas) ===")

BD_GEO_DATA = [
    {
        "name": "Dhaka",
        "bn_name": "ঢাকা",
        "order": 1,
        "districts": [
            {
                "name": "Dhaka", "bn_name": "ঢাকা", "lat": 23.8103, "lon": 90.4125,
                "upazilas": [
                    ("Dhanmondi", "ধানমন্ডি", "1205"),
                    ("Gulshan", "গুলশান", "1212"),
                    ("Banani", "বনানী", "1213"),
                    ("Uttara", "উত্তরা", "1230"),
                    ("Mirpur", "মিরপুর", "1216"),
                    ("Mohammadpur", "মোহাম্মদপুর", "1207"),
                    ("Motijheel", "মতিঝিল", "1000"),
                    ("Tejgaon", "তেজগাঁও", "1208"),
                    ("Badda", "বাড্ডা", "1212"),
                    ("Khilgaon", "খিলগাঁও", "1219"),
                    ("Savar", "সাভার", "1340"),
                    ("Dhamrai", "ধামরাই", "1350"),
                    ("Keraniganj", "কেরানীগঞ্জ", "1310"),
                    ("Nawabganj", "নবাবগঞ্জ", "1320"),
                    ("Dohar", "দোহার", "1330"),
                ]
            },
            {
                "name": "Gazipur", "bn_name": "গাজীপুর", "lat": 23.9999, "lon": 90.4203,
                "upazilas": [
                    ("Gazipur Sadar", "গাজীপুর সদর", "1700"),
                    ("Kaliakair", "কালিয়াকৈর", "1750"),
                    ("Kapasia", "কাপাসিয়া", "1730"),
                    ("Sreepur", "শ্রীপুর", "1740"),
                    ("Kaliganj", "কালীগঞ্জ", "1720"),
                    ("Tongi", "টঙ্গী", "1710")
                ]
            },
            {
                "name": "Narayanganj", "bn_name": "নারায়ণগঞ্জ", "lat": 23.6238, "lon": 90.5000,
                "upazilas": [
                    ("Narayanganj Sadar", "নারায়ণগঞ্জ সদর", "1400"),
                    ("Bandar", "বন্দর", "1410"),
                    ("Fatullah", "ফতুল্লা", "1420"),
                    ("Siddhirganj", "সিদ্ধিরগঞ্জ", "1430"),
                    ("Rupganj", "রূপগঞ্জ", "1460"),
                    ("Sonargaon", "সোনারগাঁও", "1440"),
                    ("Araihazar", "আড়াইহাজার", "1450")
                ]
            },
            {
                "name": "Tangail", "bn_name": "টাঙ্গাইল", "lat": 24.2513, "lon": 89.9167,
                "upazilas": [
                    ("Tangail Sadar", "টাঙ্গাইল সদর", "1900"),
                    ("Mirzapur", "মির্জাপুর", "1940"),
                    ("Madhupur", "মধুপুর", "1996"),
                    ("Gopalpur", "গোপালপুর", "1960"),
                    ("Ghatail", "ঘাটাইল", "1980"),
                    ("Kalihati", "কালিহাতী", "1970"),
                    ("Sakhipur", "সখীপুর", "1950")
                ]
            },
            {
                "name": "Faridpur", "bn_name": "ফরিদপুর", "lat": 23.6071, "lon": 89.8429,
                "upazilas": [
                    ("Faridpur Sadar", "ফরিদপুর সদর", "7800"),
                    ("Boalmari", "বোয়ালমারী", "7860"),
                    ("Bhanga", "ভাঙ্গা", "7830"),
                    ("Madhukhali", "মধুখালী", "7850"),
                    ("Nagarkanda", "নগরকান্দা", "7840")
                ]
            },
            {
                "name": "Manikganj", "bn_name": "মানিকগঞ্জ", "lat": 23.8644, "lon": 90.0047,
                "upazilas": [
                    ("Manikganj Sadar", "মানিকগঞ্জ সদর", "1800"),
                    ("Singair", "সিংগাইর", "1820"),
                    ("Saturia", "সাটুরিয়া", "1810"),
                    ("Ghior", "ঘিওর", "1840"),
                    ("Harirampur", "হরিরামপুর", "1830")
                ]
            },
            {
                "name": "Munshiganj", "bn_name": "মুন্সীগঞ্জ", "lat": 23.5422, "lon": 90.5305,
                "upazilas": [
                    ("Munshiganj Sadar", "মুন্সীগঞ্জ সদর", "1500"),
                    ("Sreenagar", "শ্রীনগর", "1550"),
                    ("Sirajdikhan", "সিরাজদিখান", "1540"),
                    ("Lohajang", "লৌহজং", "1530"),
                    ("Gazaria", "গজারিয়া", "1510")
                ]
            },
            {
                "name": "Narsingdi", "bn_name": "নরসিংদী", "lat": 23.9322, "lon": 90.7154,
                "upazilas": [
                    ("Narsingdi Sadar", "নরসিংদী সদর", "1600"),
                    ("Palash", "পলাশ", "1610"),
                    ("Shibpur", "শিবপুর", "1620"),
                    ("Raipura", "রায়পুরা", "1630"),
                    ("Monohardi", "মনোহরদী", "1650"),
                    ("Belabo", "বেলাবো", "1640")
                ]
            },
            {
                "name": "Gopalganj", "bn_name": "গোপালগঞ্জ", "lat": 23.0051, "lon": 89.8266,
                "upazilas": [
                    ("Gopalganj Sadar", "গোপালগঞ্জ সদর", "8100"),
                    ("Kashiani", "কাশিয়ানী", "8120"),
                    ("Kotalipara", "কোটালীপাড়া", "8110"),
                    ("Muksudpur", "মুকসুদপুর", "8140"),
                    ("Tungipara", "টুঙ্গিপাড়া", "8130")
                ]
            },
            {
                "name": "Madaripur", "bn_name": "মাদারীপুর", "lat": 23.1641, "lon": 90.1897,
                "upazilas": [
                    ("Madaripur Sadar", "মাদারীপুর সদর", "7900"),
                    ("Shibchar", "শিবচর", "7930"),
                    ("Kalkini", "কালকিনি", "7920"),
                    ("Rajoir", "রাজৈর", "7910")
                ]
            },
            {
                "name": "Rajbari", "bn_name": "রাজবাড়ী", "lat": 23.7574, "lon": 89.6445,
                "upazilas": [
                    ("Rajbari Sadar", "রাজবাড়ী সদর", "7700"),
                    ("Goalanda", "গোয়ালন্দ", "7710"),
                    ("Pangsha", "পাংশা", "7720"),
                    ("Baliakandi", "বালিয়াকান্দি", "7730"),
                    ("Kalukhali", "কালুখালী", "7721")
                ]
            },
            {
                "name": "Shariatpur", "bn_name": "শরীয়তপুর", "lat": 23.2423, "lon": 90.4348,
                "upazilas": [
                    ("Shariatpur Sadar", "শরীয়তপুর সদর", "8000"),
                    ("Zajira", "জাজিরা", "8010"),
                    ("Naria", "নড়িয়া", "8020"),
                    ("Bhedarganj", "ভেদরগঞ্জ", "8030"),
                    ("Damudya", "ডামুড্যা", "8040"),
                    ("Gosairhat", "গোসাইরহাট", "8050")
                ]
            },
            {
                "name": "Kishoreganj", "bn_name": "কিশোরগঞ্জ", "lat": 24.4449, "lon": 90.7766,
                "upazilas": [
                    ("Kishoreganj Sadar", "কিশোরগঞ্জ সদর", "2300"),
                    ("Bhairab", "ভৈরব", "2350"),
                    ("Bajitpur", "বাজিতপুর", "2336"),
                    ("Kuliarchar", "কুলিয়ারচর", "2340"),
                    ("Pakundia", "পাকুন্দিয়া", "2326"),
                    ("Karimganj", "করিমগঞ্জ", "2310"),
                    ("Katiadi", "কটিয়াদী", "2330")
                ]
            }
        ]
    },
    {
        "name": "Chattogram",
        "bn_name": "চট্টগ্রাম",
        "order": 2,
        "districts": [
            {
                "name": "Chattogram", "bn_name": "চট্টগ্রাম", "lat": 22.3569, "lon": 91.7832,
                "upazilas": [
                    ("Kotwali", "কোতোয়ালী", "4000"),
                    ("Panchlaish", "পাঁচলাইশ", "4203"),
                    ("Agrabad", "আগ্রাবাদ", "4100"),
                    ("Halishahar", "হালিশহর", "4216"),
                    ("Khulshi", "খুলশী", "4225"),
                    ("Sitakunda", "সীতাকুণ্ড", "4310"),
                    ("Mirsharai", "মীরসরাই", "4320"),
                    ("Hathazari", "হাটহাজারী", "4330"),
                    ("Raozan", "রাউজান", "4340"),
                    ("Patiya", "পটিয়া", "4370"),
                    ("Boalkhali", "বোয়ালখালী", "4360"),
                    ("Anwara", "আনোয়ারা", "4376")
                ]
            },
            {
                "name": "Cox's Bazar", "bn_name": "কক্সবাজার", "lat": 21.4272, "lon": 92.0058,
                "upazilas": [
                    ("Cox's Bazar Sadar", "কক্সবাজার সদর", "4700"),
                    ("Ramu", "রামু", "4730"),
                    ("Chakaria", "চকরিয়া", "4740"),
                    ("Teknaf", "টেকনাফ", "4760"),
                    ("Ukhiya", "উখিয়া", "4750"),
                    ("Maheshkhali", "মহেশখালী", "4710")
                ]
            },
            {
                "name": "Cumilla", "bn_name": "কুমিল্লা", "lat": 23.4682, "lon": 91.1788,
                "upazilas": [
                    ("Cumilla Adarsha Sadar", "কুমিল্লা আদর্শ সদর", "3500"),
                    ("Cumilla Sadar Dakshin", "কুমিল্লা সদর দক্ষিণ", "3501"),
                    ("Daudkandi", "দাউদকান্দি", "3516"),
                    ("Chandina", "চান্দিনা", "3510"),
                    ("Debidwar", "দেবিদ্বার", "3530"),
                    ("Burichang", "বুড়িচং", "3520"),
                    ("Brahmanpara", "ব্রাহ্মণপাড়া", "3526"),
                    ("Laksam", "লাকসাম", "3570"),
                    ("Chauddagram", "চৌদ্দগ্রাম", "3550")
                ]
            },
            {
                "name": "Brahmanbaria", "bn_name": "ব্রাহ্মণবাড়িয়া", "lat": 23.9571, "lon": 91.1119,
                "upazilas": [
                    ("Brahmanbaria Sadar", "ব্রাহ্মণবাড়িয়া সদর", "3400"),
                    ("Ashuganj", "আশুগঞ্জ", "3402"),
                    ("Sarail", "সরাইল", "3430"),
                    ("Kasba", "কসবা", "3460"),
                    ("Nabinagar", "নবীনগর", "3410"),
                    ("Bancharampur", "বাঞ্ছারামপুর", "3420"),
                    ("Akhaura", "আখাউড়া", "3450")
                ]
            },
            {
                "name": "Chandpur", "bn_name": "চাঁদপুর", "lat": 23.2333, "lon": 90.6667,
                "upazilas": [
                    ("Chandpur Sadar", "চাঁদপুর সদর", "3600"),
                    ("Hajiganj", "হাজীগঞ্জ", "3610"),
                    ("Matlab Dakshin", "মতলব দক্ষিণ", "3630"),
                    ("Matlab Uttar", "মতলব উত্তর", "3640"),
                    ("Shahrasti", "শাহরাস্তি", "3620"),
                    ("Faridganj", "ফরিদগঞ্জ", "3650")
                ]
            },
            {
                "name": "Noakhali", "bn_name": "নোয়াখালী", "lat": 22.8696, "lon": 91.0994,
                "upazilas": [
                    ("Noakhali Sadar", "নোয়াখালী সদর", "3800"),
                    ("Begumganj", "বেগমগঞ্জ", "3820"),
                    ("Chatkhil", "চাটখিল", "3870"),
                    ("Senbagh", "সেনবাগ", "3860"),
                    ("Companiganj", "কোম্পানীগঞ্জ", "3850"),
                    ("Hatiya", "হাতিয়া", "3890")
                ]
            },
            {
                "name": "Feni", "bn_name": "ফেনী", "lat": 23.0159, "lon": 91.3976,
                "upazilas": [
                    ("Feni Sadar", "ফেনী সদর", "3900"),
                    ("Daganbhuiyan", "দাগনভূঞা", "3920"),
                    ("Chhagalnaiya", "ছাগলনাইয়া", "3910"),
                    ("Parshuram", "পরশুরাম", "3940"),
                    ("Fulgazi", "ফুলগাজী", "3930"),
                    ("Sonagazi", "সোনাগাজী", "3950")
                ]
            },
            {
                "name": "Lakshmipur", "bn_name": "লক্ষ্মীপুর", "lat": 22.9425, "lon": 90.8412,
                "upazilas": [
                    ("Lakshmipur Sadar", "লক্ষ্মীপুর সদর", "3700"),
                    ("Raipur", "রায়পুর", "3710"),
                    ("Ramganj", "রামগঞ্জ", "3720"),
                    ("Ramgati", "রামগতি", "3730"),
                    ("Kamalnagar", "কমলনগর", "3731")
                ]
            },
            {
                "name": "Khagrachhari", "bn_name": "খাগড়াছড়ি", "lat": 23.1193, "lon": 91.9847,
                "upazilas": [
                    ("Khagrachhari Sadar", "খাগড়াছড়ি সদর", "4400"),
                    ("Dighinala", "দীঘিনালা", "4420"),
                    ("Panchhari", "পানছড়ি", "4410"),
                    ("Ramgarh", "রামগড়", "4440")
                ]
            },
            {
                "name": "Rangamati", "bn_name": "রাঙ্গামাটি", "lat": 22.7324, "lon": 92.2985,
                "upazilas": [
                    ("Rangamati Sadar", "রাঙ্গামাটি সদর", "4500"),
                    ("Kaptai", "কাপ্তাই", "4530"),
                    ("Kawkhali", "কাউখালী", "4510"),
                    ("Baghaichhari", "বাঘাইছড়ি", "4540")
                ]
            },
            {
                "name": "Bandarban", "bn_name": "বান্দরবান", "lat": 22.1953, "lon": 92.2184,
                "upazilas": [
                    ("Bandarban Sadar", "বান্দরবান সদর", "4600"),
                    ("Ruma", "রুমা", "4620"),
                    ("Thanchi", "থানচি", "4630"),
                    ("Lama", "লামা", "4641")
                ]
            }
        ]
    },
    {
        "name": "Rajshahi",
        "bn_name": "রাজশাহী",
        "order": 3,
        "districts": [
            {
                "name": "Rajshahi", "bn_name": "রাজশাহী", "lat": 24.3745, "lon": 88.6042,
                "upazilas": [
                    ("Boalia", "বোয়ালিয়া", "6000"),
                    ("Motihar", "মতিহার", "6204"),
                    ("Rajpara", "রাজপাড়া", "6000"),
                    ("Shah Makhdum", "শাহ মখদুম", "6203"),
                    ("Paba", "পবা", "6210"),
                    ("Godagari", "গোদাগাড়ী", "6290"),
                    ("Tanore", "তানোর", "6240"),
                    ("Bagmara", "বাগমারা", "6250"),
                    ("Durgapur", "দুর্গাপুর", "6240"),
                    ("Puthia", "পুঠিয়া", "6260"),
                    ("Charghat", "চারঘাট", "6270")
                ]
            },
            {
                "name": "Bogura", "bn_name": "বগুড়া", "lat": 24.8465, "lon": 89.3777,
                "upazilas": [
                    ("Bogura Sadar", "বগুড়া সদর", "5800"),
                    ("Sherpur", "শেরপুর", "5840"),
                    ("Shibganj", "শিবগঞ্জ", "5810"),
                    ("Gabtali", "গাবতলী", "5820"),
                    ("Kahaloo", "কাহালু", "5870"),
                    ("Nandigram", "নন্দীগ্রাম", "5890"),
                    ("Dhunat", "ধুনট", "5850"),
                    ("Sariakandi", "সারিয়াকান্দি", "5830")
                ]
            },
            {
                "name": "Pabna", "bn_name": "পাবনা", "lat": 24.0116, "lon": 89.2565,
                "upazilas": [
                    ("Pabna Sadar", "পাবনা সদর", "6600"),
                    ("Ishwardi", "ঈশ্বরদী", "6620"),
                    ("Sujanagar", "সুজানগর", "6660"),
                    ("Santhia", "সাঁথিয়া", "6670"),
                    ("Chatmohar", "চাটমোহর", "6630"),
                    ("Bera", "বেড়া", "6680")
                ]
            },
            {
                "name": "Sirajganj", "bn_name": "সিরাজগঞ্জ", "lat": 24.4534, "lon": 89.7008,
                "upazilas": [
                    ("Sirajganj Sadar", "সিরাজগঞ্জ সদর", "6700"),
                    ("Shahjadpur", "শাহজাদপুর", "6770"),
                    ("Ullahpara", "উল্লাপাড়া", "6760"),
                    ("Belkuchi", "বেলকুচি", "6740"),
                    ("Kazipur", "কাজীপুর", "6710"),
                    ("Kamarkhanda", "কামারখন্দ", "6701")
                ]
            },
            {
                "name": "Naogaon", "bn_name": "নওগাঁ", "lat": 24.8103, "lon": 88.9416,
                "upazilas": [
                    ("Naogaon Sadar", "নওগাঁ সদর", "6500"),
                    ("Manda", "মান্দা", "6520"),
                    ("Patnitala", "পত্নীতলা", "6540"),
                    ("Dhamoirhat", "ধামইরহাট", "6570"),
                    ("Mohadevpur", "মহাদেবপুর", "6530"),
                    ("Niamatpur", "নিয়ামতপুর", "6580")
                ]
            },
            {
                "name": "Natore", "bn_name": "নাটোর", "lat": 24.4206, "lon": 88.9324,
                "upazilas": [
                    ("Natore Sadar", "নাটোর সদর", "6400"),
                    ("Baraigram", "বড়াইগ্রাম", "6430"),
                    ("Singra", "সিংড়া", "6450"),
                    ("Gurudaspur", "গুরুদাসপুর", "6440"),
                    ("Lalpur", "লালপুর", "6420"),
                    ("Bagatipara", "বাগাতিপাড়া", "6410")
                ]
            },
            {
                "name": "Chapai Nawabganj", "bn_name": "চাঁপাইনবাবগঞ্জ", "lat": 24.5965, "lon": 88.2775,
                "upazilas": [
                    ("Chapai Nawabganj Sadar", "চাঁপাইনবাবগঞ্জ সদর", "6300"),
                    ("Shibganj", "শিবগঞ্জ", "6340"),
                    ("Bholahat", "ভোলাহাট", "6330"),
                    ("Gomastapur", "গোমস্তাপুর", "6320"),
                    ("Nachole", "নাচোল", "6310")
                ]
            },
            {
                "name": "Joypurhat", "bn_name": "জয়পুরহাট", "lat": 25.1015, "lon": 89.0277,
                "upazilas": [
                    ("Joypurhat Sadar", "জয়পুরহাট সদর", "5900"),
                    ("Panchbibi", "পাঁচবিবি", "5910"),
                    ("Kalai", "কালাই", "5930"),
                    ("Khetlal", "ক্ষেতলাল", "5920"),
                    ("Akkelpur", "আক্কেলপুর", "5940")
                ]
            }
        ]
    },
    {
        "name": "Khulna",
        "bn_name": "খুলনা",
        "order": 4,
        "districts": [
            {
                "name": "Khulna", "bn_name": "খুলনা", "lat": 22.8456, "lon": 89.5403,
                "upazilas": [
                    ("Khulna Sadar", "খুলনা সদর", "9100"),
                    ("Sonadanga", "সোনাডাঙ্গা", "9000"),
                    ("Khalishpur", "খালিশপুর", "9201"),
                    ("Daulatpur", "দৌলতপুর", "9202"),
                    ("Dumuria", "ডুমুরিয়া", "9250"),
                    ("Rupsha", "রূপসা", "9240"),
                    ("Paikgachha", "পাইকগাছা", "9280"),
                    ("Batiaghata", "বটিয়াঘাটা", "9260"),
                    ("Koyra", "কয়রা", "9290"),
                    ("Dacope", "দাকোপ", "9270")
                ]
            },
            {
                "name": "Jashore", "bn_name": "যশোর", "lat": 23.1664, "lon": 89.2138,
                "upazilas": [
                    ("Jashore Sadar", "যশোর সদর", "7400"),
                    ("Jhikargachha", "ঝিকরগাছা", "7420"),
                    ("Manirampur", "মণিরামপুর", "7440"),
                    ("Bagherpara", "বাঘারপাড়া", "7470"),
                    ("Abhaynagar", "অভয়নগর", "7460"),
                    ("Keshabpur", "কেশবপুর", "7450"),
                    ("Sharsha", "শার্শা", "7430")
                ]
            },
            {
                "name": "Kushtia", "bn_name": "কুষ্টিয়া", "lat": 23.9013, "lon": 89.1205,
                "upazilas": [
                    ("Kushtia Sadar", "কুষ্টিয়া সদর", "7000"),
                    ("Kumarkhali", "কুমারখালী", "7010"),
                    ("Mirpur", "মিরপুর", "7030"),
                    ("Bheramara", "ভেড়ামারা", "7040"),
                    ("Daulatpur", "দৌলতপুর", "7050"),
                    ("Khoksa", "খোকসা", "7020")
                ]
            },
            {
                "name": "Satkhira", "bn_name": "সাতক্ষীরা", "lat": 22.7185, "lon": 89.0705,
                "upazilas": [
                    ("Satkhira Sadar", "সাতক্ষীরা সদর", "9400"),
                    ("Kalaroa", "কলারোয়া", "9410"),
                    ("Tala", "তালা", "9420"),
                    ("Kaliganj", "কালীগঞ্জ", "9440"),
                    ("Shyamnagar", "শ্যামনগর", "9450"),
                    ("Assasuni", "আশাশুনি", "9430")
                ]
            },
            {
                "name": "Bagerhat", "bn_name": "বাগেরহাট", "lat": 22.6516, "lon": 89.7859,
                "upazilas": [
                    ("Bagerhat Sadar", "বাগেরহাট সদর", "9300"),
                    ("Mongla", "মোংলা", "9350"),
                    ("Fakirhat", "ফকিরহাট", "9370"),
                    ("Rampal", "রামপাল", "9340"),
                    ("Morrelganj", "মোড়েলগঞ্জ", "9320"),
                    ("Sarankhola", "শরণখোলা", "9330")
                ]
            },
            {
                "name": "Jhenaidah", "bn_name": "ঝিনাইদহ", "lat": 23.5448, "lon": 89.1539,
                "upazilas": [
                    ("Jhenaidah Sadar", "ঝিনাইদহ সদর", "7300"),
                    ("Kaliganj", "কালীগঞ্জ", "7320"),
                    ("Kotchandpur", "কোটচাঁদপুর", "7330"),
                    ("Maheshpur", "মহেশপুর", "7340"),
                    ("Shailkupa", "শৈলকুপা", "7310"),
                    ("Harinakundu", "হরিণাকুণ্ডু", "7350")
                ]
            },
            {
                "name": "Chuadanga", "bn_name": "চুয়াডাঙ্গা", "lat": 23.6402, "lon": 88.8418,
                "upazilas": [
                    ("Chuadanga Sadar", "চুয়াডাঙ্গা সদর", "7200"),
                    ("Alamdanga", "আলমডাঙ্গা", "7210"),
                    ("Damurhuda", "দামুড়হুদা", "7220"),
                    ("Jibannagar", "জীবননগর", "7230")
                ]
            },
            {
                "name": "Magura", "bn_name": "মাগুরা", "lat": 23.4873, "lon": 89.4198,
                "upazilas": [
                    ("Magura Sadar", "মাগুরা সদর", "7600"),
                    ("Sreepur", "শ্রীপুর", "7610"),
                    ("Shalikha", "শালিখা", "7620"),
                    ("Mohammadpur", "মোহাম্মদপুর", "7630")
                ]
            },
            {
                "name": "Narail", "bn_name": "নড়াইল", "lat": 23.1725, "lon": 89.5127,
                "upazilas": [
                    ("Narail Sadar", "নড়াইল সদর", "7500"),
                    ("Lohagara", "লোহাগড়া", "7510"),
                    ("Kalia", "কালিয়া", "7520")
                ]
            },
            {
                "name": "Meherpur", "bn_name": "মেহেরপুর", "lat": 23.7622, "lon": 88.6318,
                "upazilas": [
                    ("Meherpur Sadar", "মেহেরপুর সদর", "7100"),
                    ("Gangni", "গাংনী", "7110"),
                    ("Mujibnagar", "মুজিবনগর", "7102")
                ]
            }
        ]
    },
    {
        "name": "Barishal",
        "bn_name": "বরিশাল",
        "order": 5,
        "districts": [
            {
                "name": "Barishal", "bn_name": "বরিশাল", "lat": 22.7010, "lon": 90.3535,
                "upazilas": [
                    ("Barishal Sadar", "বরিশাল সদর", "8200"),
                    ("Babuganj", "বাবুগঞ্জ", "8210"),
                    ("Bakerganj", "বাকেরগঞ্জ", "8280"),
                    ("Banaripara", "বানারীপাড়া", "8220"),
                    ("Gournadi", "গৌরনদী", "8230"),
                    ("Agailjhara", "আগৈলঝাড়া", "8240"),
                    ("Mehendiganj", "মেহেন্দীগঞ্জ", "8270"),
                    ("Muladi", "মুলাদী", "8250"),
                    ("Hizla", "হিজলা", "8260"),
                    ("Wazirpur", "উজিরপুর", "8216")
                ]
            },
            {
                "name": "Patuakhali", "bn_name": "পটুয়াখালী", "lat": 22.3596, "lon": 90.3299,
                "upazilas": [
                    ("Patuakhali Sadar", "পটুয়াখালী সদর", "8600"),
                    ("Galachipa", "গলাচিপা", "8640"),
                    ("Bauphal", "বাউফল", "8620"),
                    ("Kalapara", "কলাপাড়া", "8650"),
                    ("Mirzaganj", "মির্জাগঞ্জ", "8610"),
                    ("Dumki", "দুমকি", "8602")
                ]
            },
            {
                "name": "Bhola", "bn_name": "ভোলা", "lat": 22.6859, "lon": 90.6481,
                "upazilas": [
                    ("Bhola Sadar", "ভোলা সদর", "8300"),
                    ("Daulatkhan", "দৌলতখান", "8310"),
                    ("Borhanuddin", "বোরহানউদ্দিন", "8320"),
                    ("Lalmohan", "লালমোহন", "8330"),
                    ("Char Fasson", "চরফ্যাশন", "8340"),
                    ("Tazumuddin", "তজুমদ্দিন", "8314"),
                    ("Monpura", "মনপুরা", "8343")
                ]
            },
            {
                "name": "Pirojpur", "bn_name": "পিরোজপুর", "lat": 22.5841, "lon": 89.9720,
                "upazilas": [
                    ("Pirojpur Sadar", "পিরোজপুর সদর", "8500"),
                    ("Mathbaria", "মঠবাড়িয়া", "8560"),
                    ("Bhandaria", "ভান্ডারিয়া", "8550"),
                    ("Nesarabad (Swarupkati)", "নেছারাবাদ (স্বরূপকাঠি)", "8520"),
                    ("Nazirpur", "নাজিরপুর", "8540"),
                    ("Kawkhali", "কাউখালী", "8510")
                ]
            },
            {
                "name": "Barguna", "bn_name": "বরগুনা", "lat": 22.0953, "lon": 90.1121,
                "upazilas": [
                    ("Barguna Sadar", "বরগুনা সদর", "8700"),
                    ("Amtali", "আমতলী", "8710"),
                    ("Patharghata", "পাথরঘাটা", "8720"),
                    ("Betagi", "বেতাগী", "8740"),
                    ("Bamna", "বামনা", "8730")
                ]
            },
            {
                "name": "Jhalokati", "bn_name": "ঝালকাঠি", "lat": 22.6406, "lon": 90.1987,
                "upazilas": [
                    ("Jhalokati Sadar", "ঝালকাঠি সদর", "8400"),
                    ("Nalchity", "নলছিটি", "8420"),
                    ("Rajapur", "রাজাপুর", "8410"),
                    ("Kathalia", "কাঠালিয়া", "8430")
                ]
            }
        ]
    },
    {
        "name": "Sylhet",
        "bn_name": "সিলেট",
        "order": 6,
        "districts": [
            {
                "name": "Sylhet", "bn_name": "সিলেট", "lat": 24.8949, "lon": 91.8687,
                "upazilas": [
                    ("Sylhet Sadar", "সিলেট সদর", "3100"),
                    ("Dakshin Surma", "দক্ষিণ সুরমা", "3103"),
                    ("Beanibazar", "বিয়ানীবাজার", "3170"),
                    ("Golapganj", "গোলাপগঞ্জ", "3160"),
                    ("Balaganj", "বালাগঞ্জ", "3120"),
                    ("Bishwanath", "বিশ্বনাথ", "3130"),
                    ("Fenchuganj", "ফেঞ্চুগঞ্জ", "3110"),
                    ("Gowainghat", "গোয়াইনঘাট", "3150"),
                    ("Jaintiapur", "জৈন্তাপুর", "3156"),
                    ("Zakiganj", "জকিগঞ্জ", "3190"),
                    ("Companiganj", "কোম্পানীগঞ্জ", "3140")
                ]
            },
            {
                "name": "Moulvibazar", "bn_name": "মৌলভীবাজার", "lat": 24.4829, "lon": 91.7774,
                "upazilas": [
                    ("Moulvibazar Sadar", "মৌলভীবাজার সদর", "3200"),
                    ("Sreemangal", "শ্রীমঙ্গল", "3210"),
                    ("Kamalganj", "কমলগঞ্জ", "3220"),
                    ("Kulaura", "কুলাউড়া", "3230"),
                    ("Barlekha", "বড়লেখা", "3250"),
                    ("Rajnagar", "রাজনগর", "3240"),
                    ("Juri", "জুড়ী", "3251")
                ]
            },
            {
                "name": "Habiganj", "bn_name": "হবিগঞ্জ", "lat": 24.3749, "lon": 91.4155,
                "upazilas": [
                    ("Habiganj Sadar", "হবিগঞ্জ সদর", "3300"),
                    ("Madhabpur", "মাধবপুর", "3330"),
                    ("Nabiganj", "নবীগঞ্জ", "3310"),
                    ("Bahubal", "বাহুবল", "3311"),
                    ("Chunarughat", "চুনারুঘাট", "3320"),
                    ("Baniachong", "বানিয়াচং", "3350"),
                    ("Ajmiriganj", "আজমিরীগঞ্জ", "3360")
                ]
            },
            {
                "name": "Sunamganj", "bn_name": "সুনামগঞ্জ", "lat": 25.0658, "lon": 91.3950,
                "upazilas": [
                    ("Sunamganj Sadar", "সুনামগঞ্জ সদর", "3000"),
                    ("Chhatak", "ছাতক", "3080"),
                    ("Jagannathpur", "জগন্নাথপুর", "3060"),
                    ("Derai", "দিরাই", "3040"),
                    ("Tahirpur", "তাহিরপুর", "3030"),
                    ("Dowarabazar", "দোয়ারাবাজার", "3070")
                ]
            }
        ]
    },
    {
        "name": "Rangpur",
        "bn_name": "রংপুর",
        "order": 7,
        "districts": [
            {
                "name": "Rangpur", "bn_name": "রংপুর", "lat": 25.7439, "lon": 89.2752,
                "upazilas": [
                    ("Rangpur Sadar", "রংপুর সদর", "5400"),
                    ("Mithapukur", "মিঠাপুকুর", "5460"),
                    ("Pirganj", "পীরগঞ্জ", "5470"),
                    ("Pirgachha", "পীরগাছা", "5450"),
                    ("Badarganj", "বদরগঞ্জ", "5430"),
                    ("Kaunia", "কাউনিয়া", "5440"),
                    ("Gangachhara", "গংগাচড়া", "5410"),
                    ("Taraganj", "তারাগঞ্জ", "5420")
                ]
            },
            {
                "name": "Dinajpur", "bn_name": "দিনাজপুর", "lat": 25.6217, "lon": 88.6355,
                "upazilas": [
                    ("Dinajpur Sadar", "দিনাজপুর সদর", "5200"),
                    ("Birganj", "বীরগঞ্জ", "5220"),
                    ("Kaharole", "কাহারোল", "5216"),
                    ("Biral", "বিরল", "5210"),
                    ("Fulbari", "ফুলবাড়ী", "5260"),
                    ("Parbatipur", "পার্বতীপুর", "5250"),
                    ("Nawabganj", "নবাবগঞ্জ", "5280"),
                    ("Ghoraghat", "ঘোড়াঘাট", "5290")
                ]
            },
            {
                "name": "Gaibandha", "bn_name": "গাইবান্ধা", "lat": 25.3288, "lon": 89.5408,
                "upazilas": [
                    ("Gaibandha Sadar", "গাইবান্ধা সদর", "5700"),
                    ("Gobindaganj", "গোবিন্দগঞ্জ", "5740"),
                    ("Palashbari", "পলাশবাড়ী", "5730"),
                    ("Sundarganj", "সুন্দরগঞ্জ", "5710"),
                    ("Sadullapur", "সাদুল্লাপুর", "5720")
                ]
            },
            {
                "name": "Kurigram", "bn_name": "কুড়িগ্রাম", "lat": 25.8054, "lon": 89.6362,
                "upazilas": [
                    ("Kurigram Sadar", "কুড়িগ্রাম সদর", "5600"),
                    ("Nageshwari", "নাগেশ্বরী", "5660"),
                    ("Bhurungamari", "ভুরুঙ্গামারী", "5670"),
                    ("Ulipur", "উলিপুর", "5620"),
                    ("Chilmari", "চিলমারী", "5630"),
                    ("Rajarhat", "রাজারহাট", "5610")
                ]
            },
            {
                "name": "Nilphamari", "bn_name": "নীলফামারী", "lat": 25.9318, "lon": 88.8560,
                "upazilas": [
                    ("Nilphamari Sadar", "নীলফামারী সদর", "5300"),
                    ("Saidpur", "সৈয়দপুর", "5310"),
                    ("Jaldhaka", "জলঢাকা", "5330"),
                    ("Kishoreganj", "কিশোরগঞ্জ", "5320"),
                    ("Domar", "ডোমার", "5340"),
                    ("Dimla", "ডিমলা", "5350")
                ]
            },
            {
                "name": "Thakurgaon", "bn_name": "ঠাকুরগাঁও", "lat": 26.0337, "lon": 88.4617,
                "upazilas": [
                    ("Thakurgaon Sadar", "ঠাকুরগাঁও সদর", "5100"),
                    ("Pirganj", "পীরগঞ্জ", "5110"),
                    ("Ranisankail", "রাণীশংকৈল", "5120"),
                    ("Baliadangi", "বালিয়াডাঙ্গী", "5140"),
                    ("Haripur", "হরিপুর", "5130")
                ]
            },
            {
                "name": "Panchagarh", "bn_name": "পঞ্চগড়", "lat": 26.3411, "lon": 88.5542,
                "upazilas": [
                    ("Panchagarh Sadar", "পঞ্চগড় সদর", "5000"),
                    ("Tetulia", "তেঁতুলিয়া", "5030"),
                    ("Boda", "বোদা", "5010"),
                    ("Debiganj", "দেবীগঞ্জ", "5020"),
                    ("Atwari", "আটোয়ারী", "5040")
                ]
            },
            {
                "name": "Lalmonirhat", "bn_name": "লালমনিরহাট", "lat": 25.9923, "lon": 89.2847,
                "upazilas": [
                    ("Lalmonirhat Sadar", "লালমনিরহাট সদর", "5500"),
                    ("Aditmari", "আদিতমারী", "5510"),
                    ("Kaliganj", "কালীগঞ্জ", "5520"),
                    ("Hatibandha", "হাতীবান্ধা", "5530"),
                    ("Patgram", "পাটগ্রাম", "5540")
                ]
            }
        ]
    },
    {
        "name": "Mymensingh",
        "bn_name": "ময়মনসিংহ",
        "order": 8,
        "districts": [
            {
                "name": "Mymensingh", "bn_name": "ময়মনসিংহ", "lat": 24.7471, "lon": 90.4203,
                "upazilas": [
                    ("Mymensingh Sadar", "ময়মনসিংহ সদর", "2200"),
                    ("Muktagachha", "মুক্তাগাছা", "2210"),
                    ("Fulbaria", "ফুলবাড়ীয়া", "2216"),
                    ("Trishal", "ত্রিশাল", "2220"),
                    ("Bhaluka", "ভালুকা", "2240"),
                    ("Gaffargaon", "গফরগাঁও", "2230"),
                    ("Ishwarganj", "ঈশ্বরগঞ্জ", "2280"),
                    ("Nandail", "নান্দাইল", "2290"),
                    ("Gouripur", "গৌরীপুর", "2270"),
                    ("Phulpur", "ফুলপুর", "2250"),
                    ("Haluaghat", "হালুয়াঘাট", "2260")
                ]
            },
            {
                "name": "Jamalpur", "bn_name": "জামালপুর", "lat": 24.9375, "lon": 89.9378,
                "upazilas": [
                    ("Jamalpur Sadar", "জামালপুর সদর", "2000"),
                    ("Sarishabari", "সরিষাবাড়ী", "2050"),
                    ("Melandaha", "মেলান্দহ", "2010"),
                    ("Islampur", "ইসলামপুর", "2020"),
                    ("Dewanganj", "দেওয়ানগঞ্জ", "2030"),
                    ("Madarganj", "মাদারগঞ্জ", "2040"),
                    ("Bakshiganj", "বকশীগঞ্জ", "2060")
                ]
            },
            {
                "name": "Netrokona", "bn_name": "নেত্রকোণা", "lat": 24.8709, "lon": 90.7279,
                "upazilas": [
                    ("Netrokona Sadar", "নেত্রকোণা সদর", "2400"),
                    ("Kendua", "কেন্দুয়া", "2480"),
                    ("Durgapur", "দুর্গাপুর", "2420"),
                    ("Kalmakanda", "কলমাকান্দা", "2430"),
                    ("Mohanganj", "মোহনগঞ্জ", "2440"),
                    ("Barhatta", "বারহাট্টা", "2410"),
                    ("Purbadhala", "পূর্বধলা", "2416")
                ]
            },
            {
                "name": "Sherpur", "bn_name": "শেরপুর", "lat": 25.0205, "lon": 90.0153,
                "upazilas": [
                    ("Sherpur Sadar", "শেরপুর সদর", "2100"),
                    ("Nalitabari", "নালিতাবাড়ী", "2110"),
                    ("Nakla", "নকলা", "2150"),
                    ("Jhenaigati", "ঝিনাইগাতী", "2120"),
                    ("Sreebardi", "শ্রীবরদী", "2140")
                ]
            }
        ]
    }
]

total_divs = 0
total_dists = 0
total_upz = 0

for d_info in BD_GEO_DATA:
    division, div_created = Division.objects.update_or_create(
        name=d_info["name"],
        defaults={
            "bn_name": d_info["bn_name"],
            "order": d_info["order"]
        }
    )
    total_divs += 1
    
    for dist_info in d_info["districts"]:
        district, dist_created = District.objects.update_or_create(
            division=division,
            name=dist_info["name"],
            defaults={
                "bn_name": dist_info["bn_name"],
                "lat": dist_info.get("lat"),
                "lon": dist_info.get("lon")
            }
        )
        total_dists += 1
        
        for upz_tuple in dist_info.get("upazilas", []):
            upz_name, upz_bn, post_code = upz_tuple
            Upazila.objects.update_or_create(
                district=district,
                name=upz_name,
                defaults={
                    "bn_name": upz_bn,
                    "post_code": post_code
                }
            )
            total_upz += 1

print(f"SUCCESS: Seeded {total_divs} Divisions, {total_dists} Districts, and {total_upz} Upazilas/Thanas!")
