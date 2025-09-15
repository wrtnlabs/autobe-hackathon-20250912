import { IPage } from "./IPage";
import { ICommunityAiExternalService } from "./ICommunityAiExternalService";

export namespace IPageICommunityAiExternalService {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ICommunityAiExternalService.ISummary[];
  };
}
