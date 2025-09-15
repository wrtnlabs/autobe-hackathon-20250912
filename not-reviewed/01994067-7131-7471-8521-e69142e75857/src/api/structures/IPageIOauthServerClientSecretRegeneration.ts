import { IPage } from "./IPage";
import { IOauthServerClientSecretRegeneration } from "./IOauthServerClientSecretRegeneration";

export namespace IPageIOauthServerClientSecretRegeneration {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IOauthServerClientSecretRegeneration.ISummary[];
  };
}
