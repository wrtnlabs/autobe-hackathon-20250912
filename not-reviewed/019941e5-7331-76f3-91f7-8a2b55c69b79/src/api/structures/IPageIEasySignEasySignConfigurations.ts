import { IPage } from "./IPage";
import { IEasySignEasySignConfigurations } from "./IEasySignEasySignConfigurations";

export namespace IPageIEasySignEasySignConfigurations {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEasySignEasySignConfigurations.ISummary[];
  };
}
