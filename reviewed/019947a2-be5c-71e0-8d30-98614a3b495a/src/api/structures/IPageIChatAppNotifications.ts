import { IPage } from "./IPage";
import { IChatAppNotifications } from "./IChatAppNotifications";

export namespace IPageIChatAppNotifications {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IChatAppNotifications.ISummary[];
  };
}
