import { IPage } from "./IPage";
import { IStoryfieldAiSystemPolicy } from "./IStoryfieldAiSystemPolicy";

export namespace IPageIStoryfieldAiSystemPolicy {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStoryfieldAiSystemPolicy.ISummary[];
  };
}
