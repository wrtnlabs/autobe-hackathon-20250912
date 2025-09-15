import { IPage } from "./IPage";
import { IAtsRecruitmentExternalApiCredential } from "./IAtsRecruitmentExternalApiCredential";

export namespace IPageIAtsRecruitmentExternalApiCredential {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IAtsRecruitmentExternalApiCredential.ISummary[];
  };
}
