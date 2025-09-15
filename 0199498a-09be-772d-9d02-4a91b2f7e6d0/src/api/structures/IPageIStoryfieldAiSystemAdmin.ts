import { IPage } from "./IPage";
import { IStoryfieldAiSystemAdmin } from "./IStoryfieldAiSystemAdmin";

export namespace IPageIStoryfieldAiSystemAdmin {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStoryfieldAiSystemAdmin.ISummary[];
  };
}
