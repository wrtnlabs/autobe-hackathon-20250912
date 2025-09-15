import { IPage } from "./IPage";
import { IOauthServerRedisCache } from "./IOauthServerRedisCache";

export namespace IPageIOauthServerRedisCache {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IOauthServerRedisCache.ISummary[];
  };
}
