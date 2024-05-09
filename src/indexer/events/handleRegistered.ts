import { EventHandlerArgs, Indexer } from "chainsauce";
import { IndexerContext } from "../handleEvent.js";
import { getPool } from "../../db/index.js";
import { decodeRegistrationDataAlloStrategy } from "../decode.js";
import { abis } from "../../lib/abi/index.js";

export async function handleRegistered(
  args: EventHandlerArgs<
    Indexer<typeof abis, IndexerContext>,
    "AlloStrategy",
    "Registered"
  >,
) {
  const {
    event,
    chainId,
    context: { db },
  } = args;

  const {
    params: { data: encodedData },
    address,
  } = event;

  const strategyAddress = address.toLowerCase();
  const pool = await getPool(chainId, strategyAddress);

  if (!pool?.id) {
    console.warn(`Pool ID was not found for strategy ${strategyAddress}`);

    return;
  }

  const {
    recipientId,
    recipientAddress,
    metadata: { pointer: metadataCid },
  } = decodeRegistrationDataAlloStrategy(encodedData);

  try {
    await db
      .insertInto("recipients")
      .values({
        id: recipientId,
        chainId,
        poolId: pool.id,
        strategyAddress,
        recipientAddress: recipientAddress.toLowerCase(),
        anchorAddress:
          recipientId !== recipientAddress ? recipientId.toLowerCase() : null,
        status: "PENDING",
        metadataCid,
        createdAtBlock: event.blockNumber,
        updatedAtBlock: event.blockNumber,
        tags: ["allo"],
      })
      .execute();
  } catch (err) {
    console.warn("DB write error");
  }
}