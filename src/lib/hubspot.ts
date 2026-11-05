const API = "https://api.hubapi.com/crm/v3/objects/contacts";

export type Lead = {
  name: string;
  email: string;
  phone?: string;
  course?: string;
  summary?: string;
  source: string;
};

function splitName(name: string) {
  const [firstname, ...rest] = name.trim().split(/\s+/);
  return { firstname, lastname: rest.join(" ") };
}

async function hubspot(url: string, method: "POST" | "PATCH", properties: Record<string, string>) {
  const token = import.meta.env.HUBSPOT_TOKEN ?? process.env.HUBSPOT_TOKEN;
  if (!token) throw new Error("HUBSPOT_TOKEN is not set");

  return fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties }),
  });
}

export async function saveLead(lead: Lead): Promise<void> {
  const enquiry = {
    ...splitName(lead.name),
    email: lead.email,
    ...(lead.phone && { phone: lead.phone }),
    course_interest: lead.course ?? "",
    enquiry_summary: lead.summary ?? "",
    enquiry_source: lead.source,
  };

  const created = await hubspot(API, "POST", { ...enquiry, lifecyclestage: "lead", hs_lead_status: "NEW" });
  if (created.ok) return;

  if (created.status === 409) {
    const updated = await hubspot(`${API}/${encodeURIComponent(lead.email)}?idProperty=email`, "PATCH", enquiry);
    if (updated.ok) return;
    throw new Error(`HubSpot update failed: ${updated.status} ${await updated.text()}`);
  }

  throw new Error(`HubSpot create failed: ${created.status} ${await created.text()}`);
}
