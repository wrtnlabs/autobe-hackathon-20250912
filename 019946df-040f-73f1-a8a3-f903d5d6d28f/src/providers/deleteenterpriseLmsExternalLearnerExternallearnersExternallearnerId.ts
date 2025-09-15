import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Permanently delete the external learner account identified by ID.
 *
 * This operation irrevocably removes the user from the system.
 *
 * Only the authenticated external learner themselves may delete their account.
 *
 * @param props - Object containing the authenticated external learner and the
 *   ID of the external learner to delete
 * @param props.externalLearner - The authenticated external learner payload
 * @param props.externallearnerId - Unique identifier of the target external
 *   learner
 * @throws {Error} If the external learner record doesn't exist or authorization
 *   fails
 */
export async function deleteenterpriseLmsExternalLearnerExternallearnersExternallearnerId(props: {
  externalLearner: ExternallearnerPayload;
  externallearnerId: string;
}): Promise<void> {
  const { externalLearner, externallearnerId } = props;

  // Fetch the external learner record or throw if not found
  const record =
    await MyGlobal.prisma.enterprise_lms_externallearner.findUniqueOrThrow({
      where: { id: externallearnerId },
    });

  // Authorization check: only the user themselves can delete their account
  if (record.id !== externalLearner.id) {
    throw new Error("Unauthorized: You can only delete your own account");
  }

  // Perform hard delete
  await MyGlobal.prisma.enterprise_lms_externallearner.delete({
    where: { id: externallearnerId },
  });
}
