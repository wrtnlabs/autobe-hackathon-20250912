import { IPage } from "./IPage";
import { IChatbotSlotmachinePlay } from "./IChatbotSlotmachinePlay";

export namespace IPageIChatbotSlotmachinePlay {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IChatbotSlotmachinePlay.ISummary[];
  };
}
