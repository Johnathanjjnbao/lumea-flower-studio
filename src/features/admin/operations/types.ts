export interface AdminDeliverySettings {
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  sameDayEnabled: boolean;
  sameDayCutoff: string;
  pickupNameVi: string;
  pickupNameKo: string;
  pickupAddressVi: string;
  pickupAddressKo: string;
  pickupHoursVi: string;
  pickupHoursKo: string;
  deliveryHelpVi: string;
  deliveryHelpKo: string;
}

export interface AdminDeliveryArea {
  id: string | null;
  stableCode: string;
  nameVi: string;
  nameKo: string;
  active: boolean;
  sortOrder: number;
}

export interface AdminDeliveryZone {
  id: string | null;
  stableCode: string;
  nameVi: string;
  nameKo: string;
  helpVi: string;
  helpKo: string;
  feeAmount: number;
  active: boolean;
  sameDayEligible: boolean;
  sortOrder: number;
  areas: AdminDeliveryArea[];
}

export interface AdminDeliveryWindow {
  id: string | null;
  stableCode: string;
  labelVi: string;
  labelKo: string;
  helpVi: string;
  helpKo: string;
  startTime: string;
  endTime: string;
  active: boolean;
  sameDayEligible: boolean;
  sortOrder: number;
}

export interface AdminPaymentSettings {
  bankTransferEnabled: boolean;
  cashEnabled: boolean;
  cashDeliveryEnabled: boolean;
  cashPickupEnabled: boolean;
  bankId: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  vietqrTemplate: string;
  transferReferenceTemplate: string;
  paymentDeadlineHours: number | null;
  bankInstructionsVi: string;
  bankInstructionsKo: string;
  cashInstructionsVi: string;
  cashInstructionsKo: string;
}

export interface AdminOperationsSnapshot {
  delivery: AdminDeliverySettings;
  zones: AdminDeliveryZone[];
  windows: AdminDeliveryWindow[];
  payment: AdminPaymentSettings;
}

export function emptyDeliveryZone(): AdminDeliveryZone {
  return { id: null, stableCode: "", nameVi: "", nameKo: "", helpVi: "", helpKo: "", feeAmount: 0, active: false, sameDayEligible: false, sortOrder: 0, areas: [] };
}

export function emptyDeliveryArea(): AdminDeliveryArea {
  return { id: null, stableCode: "", nameVi: "", nameKo: "", active: true, sortOrder: 0 };
}

export function emptyDeliveryWindow(): AdminDeliveryWindow {
  return { id: null, stableCode: "", labelVi: "", labelKo: "", helpVi: "", helpKo: "", startTime: "", endTime: "", active: false, sameDayEligible: false, sortOrder: 0 };
}
