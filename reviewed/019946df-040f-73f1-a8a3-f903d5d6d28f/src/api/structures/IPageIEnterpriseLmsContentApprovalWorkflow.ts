import { IPage } from "./IPage";
import { IEnterpriseLmsContentApprovalWorkflow } from "./IEnterpriseLmsContentApprovalWorkflow";

export namespace IPageIEnterpriseLmsContentApprovalWorkflow {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsContentApprovalWorkflow.ISummary[];
  };
}
