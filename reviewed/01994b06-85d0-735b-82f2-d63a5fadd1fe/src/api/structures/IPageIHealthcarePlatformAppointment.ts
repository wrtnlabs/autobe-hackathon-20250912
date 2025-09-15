import { IPage } from "./IPage";
import { IHealthcarePlatformAppointment } from "./IHealthcarePlatformAppointment";

export namespace IPageIHealthcarePlatformAppointment {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IHealthcarePlatformAppointment.ISummary[];
  };
}
