import { IPage } from "./IPage";
import { ISpecialtyCoffeeLogCoffeeLog } from "./ISpecialtyCoffeeLogCoffeeLog";

export namespace IPageISpecialtyCoffeeLogCoffeeLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ISpecialtyCoffeeLogCoffeeLog.ISummary[];
  };
}
