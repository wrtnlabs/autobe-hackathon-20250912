import { IPage } from "./IPage";
import { IChatAppGroup } from "./IChatAppGroup";

export namespace IPageIChatAppGroup {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IChatAppGroup.ISummary[];
  };
}
