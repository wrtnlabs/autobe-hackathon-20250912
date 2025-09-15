import { IPage } from "./IPage";
import { IEnterpriseLmsSystemConfigurations } from "./IEnterpriseLmsSystemConfigurations";

export namespace IPageIEnterpriseLmsSystemConfigurations {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsSystemConfigurations.ISummary[];
  };
}
