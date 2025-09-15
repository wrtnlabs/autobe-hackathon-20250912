import { IPage } from "./IPage";
import { ISpecialtyCoffeeLogCafeSuggestion } from "./ISpecialtyCoffeeLogCafeSuggestion";

export namespace IPageISpecialtyCoffeeLogCafeSuggestion {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ISpecialtyCoffeeLogCafeSuggestion.ISummary[];
  };
}
