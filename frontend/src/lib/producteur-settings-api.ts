import { apiFetch } from "@/lib/api";

export type WeekdayOption = {
  value: string;
  label: string;
};

export type DistributionPointData = {
  id?: number;
  locationLabel: string;
  distributionDay: string;
  distributionDayLabel?: string;
  distributionStartTime: string;
  distributionEndTime: string;
  orderDeadlineDay: string;
  orderDeadlineDayLabel?: string;
  orderDeadlineTime: string;
  maxBaskets?: number | null;
};

export type ProducerProfile = {
  fullName: string | null;
  phone: string | null;
  email: string;
  slug: string | null;
  advanceBookingDays: number;
  producerPhotoPath: string | null;
  producerOrganic: boolean;
  producerDescription: string | null;
  shopUrl: string | null;
};

export type ProducerProfilePayload = {
  fullName: string;
  phone: string;
  email: string;
  slug: string;
  advanceBookingDays: number;
  producerOrganic: boolean;
  producerDescription: string;
  photo?: File | null;
  removePhoto?: boolean;
};

export type ProducerSettings = ProducerProfile & {
  distributionPoints: DistributionPointData[];
};

export function fetchProducerSettings(): Promise<ProducerSettings> {
  return apiFetch<ProducerSettings>("/api/producteur/settings");
}

export function fetchWeekdays(): Promise<WeekdayOption[]> {
  return apiFetch<WeekdayOption[]>("/api/producteur/settings/weekdays");
}

function buildProducerProfileFormData(payload: ProducerProfilePayload): FormData {
  const formData = new FormData();
  formData.append("fullName", payload.fullName);
  formData.append("phone", payload.phone);
  formData.append("email", payload.email);
  formData.append("slug", payload.slug);
  formData.append("advanceBookingDays", String(payload.advanceBookingDays));
  formData.append("producerOrganic", payload.producerOrganic ? "1" : "0");
  formData.append("producerDescription", payload.producerDescription);
  if (payload.removePhoto) {
    formData.append("removePhoto", "1");
  }
  if (payload.photo && payload.photo.size > 0) {
    formData.append("photo", payload.photo, payload.photo.name);
  }
  return formData;
}

export function updateProducerProfile(payload: ProducerProfilePayload): Promise<ProducerSettings> {
  return apiFetch<ProducerSettings>("/api/producteur/settings/profile", {
    method: "POST",
    body: buildProducerProfileFormData(payload),
  });
}

export function createDistributionPoint(
  payload: DistributionPointData,
): Promise<DistributionPointData> {
  return apiFetch<DistributionPointData>("/api/producteur/settings/distribution-points", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateDistributionPoint(
  id: number,
  payload: DistributionPointData,
): Promise<DistributionPointData> {
  return apiFetch<DistributionPointData>(`/api/producteur/settings/distribution-points/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteDistributionPoint(id: number): Promise<void> {
  return apiFetch<void>(`/api/producteur/settings/distribution-points/${id}`, {
    method: "DELETE",
  });
}

export function emptyDistributionPoint(): DistributionPointData {
  return {
    locationLabel: "",
    distributionDay: "saturday",
    distributionStartTime: "09:00",
    distributionEndTime: "12:00",
    orderDeadlineDay: "thursday",
    orderDeadlineTime: "18:00",
    maxBaskets: null,
  };
}

export function getDayLabel(dayValue: string, weekdays: WeekdayOption[]): string {
  return weekdays.find((d) => d.value === dayValue)?.label ?? dayValue;
}
