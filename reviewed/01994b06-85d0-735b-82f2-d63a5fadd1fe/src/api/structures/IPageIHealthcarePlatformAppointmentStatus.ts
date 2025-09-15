import { IPage } from "./IPage";
import { IHealthcarePlatformAppointmentStatus } from "./IHealthcarePlatformAppointmentStatus";

export namespace IPageIHealthcarePlatformAppointmentStatus {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformAppointmentStatus.ISummary[];
  };
}
