import { IPage } from "./IPage";
import { IHealthcarePlatformAppointmentWaitlist } from "./IHealthcarePlatformAppointmentWaitlist";

export namespace IPageIHealthcarePlatformAppointmentWaitlist {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformAppointmentWaitlist.ISummary[];
  };
}
