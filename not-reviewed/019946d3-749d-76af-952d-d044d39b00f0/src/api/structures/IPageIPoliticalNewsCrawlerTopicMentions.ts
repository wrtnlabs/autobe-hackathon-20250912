import { IPage } from "./IPage";
import { IPoliticalNewsCrawlerTopicMentions } from "./IPoliticalNewsCrawlerTopicMentions";

export namespace IPageIPoliticalNewsCrawlerTopicMentions {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IPoliticalNewsCrawlerTopicMentions.ISummary[];
  };
}
