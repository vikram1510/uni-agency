const token = process.env.HUBSPOT_TOKEN;
if (!token) {
  console.error("HUBSPOT_TOKEN is missing. Run: node --env-file=.env scripts/hubspot-setup.mjs");
  process.exit(1);
}

const properties = [
  { name: "course_interest", label: "Course interest", type: "string", fieldType: "text" },
  { name: "enquiry_summary", label: "Enquiry summary", type: "string", fieldType: "textarea" },
  { name: "enquiry_source", label: "Enquiry source", type: "string", fieldType: "text" },
];

for (const property of properties) {
  const res = await fetch("https://api.hubapi.com/crm/v3/properties/contacts", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...property, groupName: "contactinformation" }),
  });

  if (res.ok) console.log(`Created ${property.name}`);
  else if (res.status === 409) console.log(`${property.name} already exists`);
  else {
    console.error(`Failed to create ${property.name}: ${res.status} ${await res.text()}`);
    process.exitCode = 1;
  }
}
