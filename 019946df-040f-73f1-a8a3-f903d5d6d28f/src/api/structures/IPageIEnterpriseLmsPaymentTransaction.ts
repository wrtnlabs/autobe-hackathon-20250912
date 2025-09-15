import { IPage } from "./IPage";
import { IEnterpriseLmsPaymentTransaction } from "./IEnterpriseLmsPaymentTransaction";

export namespace IPageIEnterpriseLmsPaymentTransaction {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsPaymentTransaction.ISummary[];
  };
}
