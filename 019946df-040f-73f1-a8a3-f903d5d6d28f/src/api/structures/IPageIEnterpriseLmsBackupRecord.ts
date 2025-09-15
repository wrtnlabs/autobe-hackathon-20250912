import { IPage } from "./IPage";
import { IEnterpriseLmsBackupRecord } from "./IEnterpriseLmsBackupRecord";

export namespace IPageIEnterpriseLmsBackupRecord {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEnterpriseLmsBackupRecord.ISummary[];
  };
}
