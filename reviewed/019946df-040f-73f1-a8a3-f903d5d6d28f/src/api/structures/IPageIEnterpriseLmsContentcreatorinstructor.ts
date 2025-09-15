import { IPage } from "./IPage";
import { IEnterpriseLmsContentCreatorInstructor } from "./IEnterpriseLmsContentCreatorInstructor";

export namespace IPageIEnterpriseLmsContentcreatorinstructor {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsContentCreatorInstructor.ISummary[];
  };
}
