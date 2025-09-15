import { IPage } from "./IPage";
import { IStoryfieldAiStoryImage } from "./IStoryfieldAiStoryImage";

export namespace IPageIStoryfieldAiStoryImage {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IStoryfieldAiStoryImage.ISummary[];
  };
}
