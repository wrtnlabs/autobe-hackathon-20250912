import { IPage } from "./IPage";
import { IEnterpriseLmsIntegrationSetting } from "./IEnterpriseLmsIntegrationSetting";

export namespace IPageIEnterpriseLmsIntegrationSetting {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsIntegrationSetting.ISummary[];
  };
}
