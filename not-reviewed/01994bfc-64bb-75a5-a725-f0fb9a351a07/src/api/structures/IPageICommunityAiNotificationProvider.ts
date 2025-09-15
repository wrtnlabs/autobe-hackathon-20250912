import { IPage } from "./IPage";
import { ICommunityAiNotificationProvider } from "./ICommunityAiNotificationProvider";

export namespace IPageICommunityAiNotificationProvider {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityAiNotificationProvider.ISummary[];
  };
}
