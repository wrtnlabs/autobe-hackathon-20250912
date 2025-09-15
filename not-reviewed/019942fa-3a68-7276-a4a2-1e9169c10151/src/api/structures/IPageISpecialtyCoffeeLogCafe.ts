import { IPage } from "./IPage";
import { ISpecialtyCoffeeLogCafe } from "./ISpecialtyCoffeeLogCafe";

export namespace IPageISpecialtyCoffeeLogCafe {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ISpecialtyCoffeeLogCafe.ISummary[];
  };
}
