import { IPage } from "./IPage";
import { IFlexOfficeMarketplaceWidget } from "./IFlexOfficeMarketplaceWidget";

export namespace IPageIFlexOfficeMarketplaceWidget {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IFlexOfficeMarketplaceWidget.ISummary[];
  };
}
