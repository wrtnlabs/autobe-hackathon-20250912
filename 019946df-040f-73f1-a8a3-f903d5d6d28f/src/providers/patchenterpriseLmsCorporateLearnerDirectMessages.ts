import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDirectMessage";
import { IPageIEnterpriseLmsDirectMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsDirectMessage";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Search and retrieve a list of direct messages with filters and pagination
 *
 * This operation retrieves a paginated and optionally filtered list of direct
 * messages exchanged between users within the tenant's enterprise LMS
 * environment.
 *
 * Tenant isolation is enforced using the authenticated corporateLearner's
 * tenant ID.
 *
 * @param props - Object containing corporateLearner payload and search filters
 * @param props.corporateLearner - Authenticated corporate learner payload
 * @param props.body - Search parameters and pagination settings
 * @returns A paginated list of direct message summaries matching search
 *   criteria
 * @throws {Error} When database query or transformation fails
 */
export async function patchenterpriseLmsCorporateLearnerDirectMessages(props: {
  corporateLearner: CorporatelearnerPayload;
  body: IEnterpriseLmsDirectMessage.IRequest;
}): Promise<IPageIEnterpriseLmsDirectMessage.ISummary> {
  const { corporateLearner, body } = props;

  const where: {} = {
    tenant_id: corporateLearner.id,
  };

  if (body.tenant_id !== undefined) where.tenant_id = body.tenant_id;
  if (body.sender_id !== undefined) where.sender_id = body.sender_id;
  if (body.recipient_id !== undefined) where.recipient_id = body.recipient_id;
  if (body.body !== undefined) where.body = { contains: body.body };

  if (body.sent_at_start !== undefined || body.sent_at_end !== undefined) {
    (where as any).sent_at = {};
    if (body.sent_at_start !== undefined)
      (where as any).sent_at.gte = body.sent_at_start;
    if (body.sent_at_end !== undefined)
      (where as any).sent_at.lte = body.sent_at_end;
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_direct_messages.findMany({
      where,
      orderBy: { sent_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        tenant_id: true,
        sender_id: true,
        recipient_id: true,
        body: true,
        sent_at: true,
        read_at: true,
      },
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
    data: results.map((e) => ({
      id: e.id,
      tenant_id: e.tenant_id,
      sender_id: e.sender_id,
      recipient_id: e.recipient_id,
      body: e.body,
      sent_at: toISOStringSafe(e.sent_at),
      read_at: e.read_at ? toISOStringSafe(e.read_at) : null,
    })),
  };
}
