import { IPage } from "./IPage";
import { IStoryfieldAiDeploymentLog } from "./IStoryfieldAiDeploymentLog";

export namespace IPageIStoryfieldAiDeploymentLog {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStoryfieldAiDeploymentLog.ISummary[];
  };
}
