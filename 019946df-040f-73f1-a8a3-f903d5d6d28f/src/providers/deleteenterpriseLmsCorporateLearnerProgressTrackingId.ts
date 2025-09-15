import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Deletes (soft delete) a learner's progress tracking record by ID.
 *
 * This function performs a soft deletion by setting the deleted_at timestamp on
 * the progress tracking record identified by the given ID. It enforces
 * authorization by ensuring only the owning corporate learner can delete their
 * own records.
 *
 * @param props - The parameters including the authenticated corporate learner
 *   payload and the unique record ID to delete.
 * @param props.corporateLearner - The authenticated corporate learner
 *   performing the deletion.
 * @param props.id - The unique UUID of the progress tracking record to delete.
 * @throws {Error} If the record does not exist.
 * @throws {Error} If the authenticated user does not own the record.
 * @throws {Error} If the record has already been deleted.
 */
export async function deleteenterpriseLmsCorporateLearnerProgressTrackingId(props: {
  corporateLearner: CorporatelearnerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { corporateLearner, id } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_progress_tracking.findFirst({
      where: { id },
    });

  if (!record) {
    throw new Error("Progress tracking record not found");
  }

  if (record.learner_id !== corporateLearner.id) {
    throw new Error(
      "Unauthorized: You can only delete your own progress tracking records",
    );
  }

  if (record.deleted_at !== null) {
    throw new Error("Progress tracking record already deleted");
  }

  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  await MyGlobal.prisma.enterprise_lms_progress_tracking.update({
    where: { id },
    data: { deleted_at: deletedAt },
  });
}
