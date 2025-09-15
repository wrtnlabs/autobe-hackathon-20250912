import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft-delete (erase) a story TTS result (storyfield_ai_tts_results table)
 *
 * This operation performs a soft deletion on a specific Text-to-Speech (TTS)
 * result associated with a generated story, scoped by the provided storyId and
 * ttsResultId. Only a system administrator may perform this operation. The
 * function finds the record, ensures it is not already deleted, then sets the
 * deleted_at timestamp to the current time.
 *
 * If the TTS result does not exist or has already been deleted, an error is
 * thrown.
 *
 * @param props - Parameters for the erase operation
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the operation
 * @param props.storyId - Unique story ID (UUID)
 * @param props.ttsResultId - ID of the TTS result to erase (UUID)
 * @returns Promise<void>
 * @throws {Error} If the specified TTS result does not exist or is already
 *   deleted.
 */
export async function deletestoryfieldAiSystemAdminStoriesStoryIdTtsResultsTtsResultId(props: {
  systemAdmin: SystemadminPayload;
  storyId: string & tags.Format<"uuid">;
  ttsResultId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Find the TTS result for this story and ensure it is not already deleted
  const ttsResult = await MyGlobal.prisma.storyfield_ai_tts_results.findFirst({
    where: {
      id: props.ttsResultId,
      storyfield_ai_story_id: props.storyId,
      deleted_at: null,
    },
  });

  if (!ttsResult) {
    throw new Error("TTS result not found or already deleted");
  }

  // Mark as soft-deleted
  await MyGlobal.prisma.storyfield_ai_tts_results.update({
    where: { id: props.ttsResultId },
    data: { deleted_at: now },
  });
}
