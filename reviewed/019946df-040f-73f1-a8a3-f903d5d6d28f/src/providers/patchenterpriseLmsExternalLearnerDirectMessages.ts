import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDirectMessage";
import { IPageIEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsDirectMessage";
import { ExternallearnerPayload } from "../decorators/payload/ExternallearnerPayload";

/**
 * Search and retrieve a list of direct messages with filters and pagination
 *
 * This operation retrieves a paginated and optionally filtered list of direct
 * messages exchanged between users within the tenant's enterprise LMS
 * environment. It supports filtering by sender, recipient, message content,
 * sent timestamp range, and tenant.
 *
 * The response includes pagination metadata to aid client rendering and
 * navigation. Soft-deleted messages (deleted_at not null) are excluded.
 *
 * @param props - Input parameters including authenticated external learner info
 *   and filtering/pagination criteria.
 * @param props.externalLearner - The authenticated external learner making the
 *   request
 * @param props.body - Filtering and pagination parameters for direct messages
 * @returns Paginated list of direct message summaries matching the criteria
 * @throws {Error} If any unexpected error occurs during database operations
 */
export async function patchenterpriseLmsExternalLearnerDirectMessages(props: {
  externalLearner: ExternallearnerPayload;
  body: IEnterpriseLmsDirectMessage.IRequest;
}): Promise<IPageIEnterpriseLmsDirectMessage.ISummary> {
  const { externalLearner, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    deleted_at: null,
  };

  if (body.tenant_id !== undefined && body.tenant_id !== null) {
    where.tenant_id = body.tenant_id;
  }
  if (body.sender_id !== undefined && body.sender_id !== null) {
    where.sender_id = body.sender_id;
  }
  if (body.recipient_id !== undefined && body.recipient_id !== null) {
    where.recipient_id = body.recipient_id;
  }
  if (body.body !== undefined && body.body !== null) {
    where.body = { contains: body.body };
  }

  if (
    (body.sent_at_start !== undefined && body.sent_at_start !== null) ||
    (body.sent_at_end !== undefined && body.sent_at_end !== null)
  ) {
    where.sent_at = {};
    if (body.sent_at_start !== undefined && body.sent_at_start !== null) {
      where.sent_at.gte = body.sent_at_start;
    }
    if (body.sent_at_end !== undefined && body.sent_at_end !== null) {
      where.sent_at.lte = body.sent_at_end;
    }
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_direct_messages.findMany({
      where,
      orderBy: { sent_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_direct_messages.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((dm) => ({
      id: dm.id,
      tenant_id: dm.tenant_id,
      sender_id: dm.sender_id,
      recipient_id: dm.recipient_id,
      body: dm.body,
      sent_at: toISOStringSafe(dm.sent_at),
      read_at: dm.read_at ? toISOStringSafe(dm.read_at) : null,
    })),
  };
}
