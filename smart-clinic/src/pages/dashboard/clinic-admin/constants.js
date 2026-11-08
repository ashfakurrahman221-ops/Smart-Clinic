export const GALLERY_CATEGORIES = [
  "Reception & Front Desk",
  "Patient Waiting Lounge",
  "Doctor Consultation Chamber",
  "Diagnostic & Pathology Lab",
  "Radiology & Ultrasound Suite",
  "Emergency & Minor OT",
  "In-house Pharmacy",
  "Exterior & Entrance",
  "Other Facilities",
];

export const SAMPLE_CLINIC_PHOTOS = [
  {
    id: "sample-1",
    image_url:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
    category: "Reception & Front Desk",
    title: "Executive Reception & Fast-Track Token Desk",
    description:
      "Centrally air-conditioned welcoming reception desk with automated digital token ticketing and multi-lingual help staff.",
    is_featured: true,
  },
  {
    id: "sample-2",
    image_url:
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
    category: "Doctor Consultation Chamber",
    title: "Specialist Consultation Chamber",
    description:
      "Hygienic, private chamber equipped with digital diagnostic tools, examination bed, and confidential patient records display.",
    is_featured: false,
  },
  {
    id: "sample-3",
    image_url:
      "https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=1200&q=80",
    category: "Diagnostic & Pathology Lab",
    title: "Automated Clinical Pathology Lab",
    description:
      "Fully automated biochemistry and hematology analyzers delivering fast, accurate, and DGDA-standard test reports.",
    is_featured: false,
  },
  {
    id: "sample-4",
    image_url:
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80",
    category: "Patient Waiting Lounge",
    title: "Spacious Patient & Family Lounge",
    description:
      "Sanitized waiting area for 50+ guests with live queue TV monitors, water dispenser, and high-speed patient Wi-Fi.",
    is_featured: false,
  },
  {
    id: "sample-5",
    image_url:
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80",
    category: "Emergency & Minor OT",
    title: "Emergency Observation & Minor OT",
    description:
      "Rapid response emergency bay with oxygen supply, defibrillator, cardiac monitor, and sterile minor procedure OT.",
    is_featured: false,
  },
  {
    id: "sample-6",
    image_url:
      "https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=1200&q=80",
    category: "In-house Pharmacy",
    title: "24/7 In-house Pharmacy Counter",
    description:
      "Dispensing genuine registered pharmaceuticals, temperature-monitored vaccines, and surgical supplies around the clock.",
    is_featured: false,
  },
];

export const SERVICE_PRESETS = [
  {
    name: "ECG (Electrocardiogram)",
    fee: "500",
    duration_minutes: 15,
    preparation_instructions:
      "Standard resting ECG; wear easily removable upper clothing",
    description: "Heart rhythm and electrical activity recording",
  },
  {
    name: "Digital X-Ray (Chest P/A)",
    fee: "800",
    duration_minutes: 15,
    preparation_instructions:
      "Remove metal objects, necklace, or jewelry before scan",
    description:
      "High-resolution digital radiography of lungs and thoracic cavity",
  },
  {
    name: "Ultrasound (USG) Whole Abdomen",
    fee: "1500",
    duration_minutes: 30,
    preparation_instructions:
      "6-8 hours overnight fasting required; drink water for full bladder",
    description:
      "Ultrasonic visualization of liver, gallbladder, kidneys, pancreas, and spleen",
  },
  {
    name: "Complete Blood Count (CBC)",
    fee: "450",
    duration_minutes: 10,
    preparation_instructions: "No special preparation needed",
    description:
      "Automated hematology test checking hemoglobin, platelets, and WBC differential",
  },
  {
    name: "Fasting Blood Sugar (FBS)",
    fee: "150",
    duration_minutes: 5,
    preparation_instructions:
      "Strict 8-10 hours fasting before blood sample collection",
    description: "Quantitative plasma glucose test for diabetic screening",
  },
  {
    name: "Lipid Profile Test",
    fee: "1100",
    duration_minutes: 10,
    preparation_instructions: "10-12 hours overnight fasting mandatory",
    description: "Cholesterol, Triglycerides, HDL, LDL, and VLDL panel",
  },
  {
    name: "Dental Scaling & Polishing",
    fee: "1200",
    duration_minutes: 40,
    preparation_instructions: "Brush teeth and rinse before appointment",
    description:
      "Professional ultrasonic calculus removal and enamel stain polishing",
  },
  {
    name: "Nebulization & Oxygen Therapy",
    fee: "350",
    duration_minutes: 20,
    preparation_instructions:
      "Breathe slowly and deeply through inhalation mask",
    description:
      "Aerosolized bronchodilator treatment for asthma and chest congestion",
  },
];

export const POPULAR_AMENITIES = [
  {
    id: "24/7 Emergency & Ambulance",
    label: "24/7 Emergency & Ambulance",
    icon: "🚑",
  },
  { id: "Wheelchair Accessible", label: "Wheelchair Accessible", icon: "♿" },
  {
    id: "In-house 24/7 Pharmacy",
    label: "In-house 24/7 Pharmacy",
    icon: "💊",
  },
  {
    id: "Diagnostic Lab on-site",
    label: "Diagnostic Lab on-site",
    icon: "🔬",
  },
  { id: "ICU & Observation Beds", label: "ICU & Observation Beds", icon: "🛏️" },
  { id: "Dedicated Parking", label: "Dedicated Parking", icon: "🅿️" },
  {
    id: "Cafeteria & Patient Lounge",
    label: "Cafeteria & Lounge",
    icon: "☕",
  },
  { id: "Free High-speed WiFi", label: "Free High-speed WiFi", icon: "📶" },
  {
    id: "Card & bKash Payment",
    label: "Card & bKash Payment",
    icon: "💳",
  },
  {
    id: "Blood Bank / Donor Network",
    label: "Blood Bank Support",
    icon: "🩸",
  },
];
