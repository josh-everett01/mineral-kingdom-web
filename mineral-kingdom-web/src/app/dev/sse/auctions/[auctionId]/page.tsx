import DevAuctionSseClient from "./DevAuctionSseClient";

export default async function DevAuctionSsePage({
  params,
}: {
  params: Promise<{ auctionId: string }>;
}) {
  const { auctionId } = await params;
  return <DevAuctionSseClient auctionId={auctionId} />;
}