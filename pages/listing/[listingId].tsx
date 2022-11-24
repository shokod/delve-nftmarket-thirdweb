import { UserCircleIcon } from '@heroicons/react/24/solid';
import {
    useContract,
    useNetwork,
    useNetworkMismatch,
    useMakeBid,
    useOffers,
    useMakeOffer,
    useBuyNow,
    MediaRenderer,
    useAddress,
    useListing,
    useAcceptDirectListingOffer
} from "@thirdweb-dev/react";
import { ListingType, NATIVE_TOKENS } from '@thirdweb-dev/sdk';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Countdown from "react-countdown";
import network from '../../utils/network';
import { ethers } from "ethers";
import toast, { Toaster } from 'react-hot-toast'


type Props = {}

function ListingPage({ }: Props) {
    const router = useRouter();
    const address = useAddress();

    const notify = () => toast('Here is your toast.');
    const { listingId } = router.query as { listingId: string };
    const [bidAmount, setBidAmount] = useState('');
    const [, switchNetwork] = useNetwork();
    const networkMismatch = useNetworkMismatch();


    const [minimumNextBid, setMinimumNextBid] = useState<{
        displayValue: string;
        symbol: string;
    }>();

    const { contract } = useContract(
        process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT,
        "marketplace"
    );


    const { mutate: makeBid } = useMakeBid(contract);

    const { data: offers } = useOffers(contract, listingId);

    const { mutate: makeOffer } = useMakeOffer(contract);

    const { mutate: buyNow } = useBuyNow(contract);

    const { data: listing, isLoading, error } = useListing(contract, listingId);

    const { mutate: acceptOffer } = useAcceptDirectListingOffer(contract);


    useEffect(() => {
        if (!listingId || !contract || !listing) return;

        if (listing.type === ListingType.Auction) {
            fetchMinNextBid();

        }
    }, [listingId, listing, contract]);

    console.log(minimumNextBid);

    const fetchMinNextBid = async () => {
        if (!listingId || !contract) return;

        const { displayValue, symbol } = await contract.auction.getMinimumNextBid(listingId);

        setMinimumNextBid({
            displayValue: displayValue,
            symbol: symbol,
        });
    };

    const formatPlaceholder = () => {
        if (!listing) return;

        if (listing.type === ListingType.Direct) {

            return "Enter offer Amount";
        }

        if (listing.type === ListingType.Auction) {
            return Number(minimumNextBid?.displayValue) == 0
                ? "Enter Bid Amount"
                : `${minimumNextBid?.displayValue} ${minimumNextBid?.symbol} or more`;

            // TODO: Improve this bid amount
        }
    };

    // Buying NFT

    const buyNft = async () => {
        if (networkMismatch) {
            switchNetwork && switchNetwork(network);
            return;
        }

        if (!listingId || !contract || !listing) return;

        await buyNow(
            {
                id: listingId,
                buyAmount: 1,
                type: listing.type,
            },
            {
                onSuccess: (data, variables, context) => {
                    alert("NFT bought sucessfully!")
                    console.log("SUCCESS", data, variables, context)
                    router.replace("/")

                },
                onError: (error, variables, context) => {
                    alert("Error: NFT could not be bought")
                    console.log('ERROR', error, variables, context)
                    router.replace("/")
                }
            }
        );
    };


    const createBidOrOffer = async () => {
        try {
            if (networkMismatch) {
                switchNetwork && switchNetwork(network);
                return;
            }

            // Handle Direct Listing
            if (listing?.type === ListingType.Direct) {
                if (listing.buyoutPrice.toString() === ethers.utils.parseEther
                    (bidAmount).toString()) {
                    console.log("Buyout Price met, buying NFT...");

                    buyNft();
                    return;
                }

                console.log("Buy out price not met, making offer...");
                await makeOffer({
                    quantity: 1,
                    listingId,
                    pricePerToken: bidAmount,

                }, {
                    onSuccess(data, variables, context) {
                        alert("Offer successful!");
                        console.log("SUCCESS", data, variables, context);
                        setBidAmount("")
                    },
                    onError(error, variables, context) {
                        alert("ERROR: Offer failed");
                        console.log("ERROR", error, variables, context);
                    },
                }
                );
            }

            // Handle Auction Listing
            if (listing?.type === ListingType.Auction) {
                console.log('Making Bid..');

                await makeBid({
                    listingId,
                    bid: bidAmount,
                }, {
                    onSuccess(data, variables, context) {
                        alert("Bid Successful!");
                        console.log("SUCCESS", data, variables, context);
                        setBidAmount("")
                    },
                    onError(error, variables, context) {
                        alert("ERROR: bid failed")
                        console.log("ERROR", error, variables, context);
                    },
                });
            }
        } catch (error) {
            console.error(error)

        }

    };

    if (isLoading)
        return (
            <div className='text-center animate-pulse text-blue-500'>
                <Header />
                <p>
                    Loading Item...
                </p>
            </div>

        );
    if (!listing) {
        return <div> Listing not found!</div>;
    }

    return (
        <div>
            <Header />

            <main className='max-w-6xl mx-auto p-2 flex flex-col lg:flex-row space-y-10 space-x-5 pr-10'>
                <div className='p-10 border mx-auto lg:mx-0 max-w-md lg:max-w-xl'>
                    <MediaRenderer src={listing?.asset.image} />
                </div>

                <section className='flex-1 space-y-5 pb-20 lg:pb-0'>
                    <div>
                        <h1 className='text-xl font-bold'>{listing.asset.name}</h1>
                        <p className='text-gray-600'>{listing.asset.description}</p>
                        <p className='flex items-center text-xs sm:text-base'>
                            <UserCircleIcon className='h-5' />
                            <span className='font-bold pr-1'>Seller : </span>
                            {listing.sellerAddress}
                        </p>
                    </div>

                    <div className='grid grid-cols-2 items-center py-2'>
                        <p className='font-bold'>Listing Type :</p>
                        <p>{listing.type === ListingType.Direct
                            ? "Direct Listing"
                            : "Auction Listing"
                        }
                        </p>

                        <p className='font-bold  text-green-600 animate-bounce'>Buy it now Price :</p>
                        <p className='text-4xl font-bold'>{listing.buyoutCurrencyValuePerToken.displayValue} {""}
                            {listing.buyoutCurrencyValuePerToken.symbol}
                        </p>

                        <button onClick={buyNft} className='col-start-2 mt-2 bg-green-600 font-bold text-white rounded-full w-44 py-4 px-10'> Buy Now</button>
                    </div>

                    {/*  TODO:If Direct, show offers here ... */}
                    {listing.type === ListingType.Direct && offers && (
                        <div className='grid grid-cols-2 gap-y-2'>
                            <p className='font-bold'>Offers: </p>
                            <p className='font-bold'>{offers.length > 0 ? offers.length : 0}
                            </p>
                            {offers?.map(offer => (
                                <>
                                    <p className='flex items-center ml-5 text-sm italic'>
                                        <UserCircleIcon className='h-3 mr-2' />
                                        {offer.offeror.slice(0, 5) + "..." + offer.offeror.slice(-5)}
                                    </p>
                                    <div>
                                        <p
                                            key={
                                                offer.listingId +
                                                offer.offeror +
                                                offer.totalOfferAmount.toString()
                                            }
                                            className='text-sm italic'>
                                            {ethers.utils.formatEther(offer.totalOfferAmount)}{""}
                                            {NATIVE_TOKENS[network].symbol}
                                        </p>
                                        {listing.sellerAddress === address && (
                                            <button onClick={() => {
                                                acceptOffer({
                                                    listingId,
                                                    addressOfOfferor: offer.offeror,
                                                }, {
                                                    onSuccess(data, variables, context) {
                                                        alert("Offer accepted successfully!");
                                                        console.log("SUCCESS", data, variables, context);
                                                        router.replace("/");
                                                    },
                                                    onError(error, variables, context) {
                                                        alert("ERROR: Offer not accepted")
                                                        console.log("ERROR", error, variables, context);
                                                    },
                                                });
                                            }}
                                                className='p-2 w-32 bg-green-500/50 rounded-lg font-bold text-xs cursor-pointer'>
                                                Accept offer
                                            </button>
                                        )}
                                    </div>
                                </>
                            ))}
                        </div>


                    )}

                    <div className='grid grid-cols-2 space-y-2 items-center'>
                        <hr className='col-span-2' />

                        <p className='col-span-2 font-bold text-black-400'>
                            {listing.type === ListingType.Direct
                                ? "Make an Offer"
                                : "Bid on this Auction"}
                        </p>


                        {/* TODO:Remaining time on auction item goes here... */}
                        {listing.type === ListingType.Auction && (
                            <>
                                <p>Current Minimum Bid :</p>
                                <p className='font-bold'>{minimumNextBid?.displayValue} {minimumNextBid?.symbol}</p>

                                <p>Time Remaining :</p>
                                <Countdown
                                    date={Number(listing.endTimeInEpochSeconds.toString())
                                        * 1000
                                    }
                                />
                            </>
                        )}
                        <input
                            className="border p-2 rounded-lg mr-5"
                            type="text"
                            onChange={e => setBidAmount(e.target.value)}
                            placeholder={formatPlaceholder()}
                        />
                        <button onClick={createBidOrOffer} className='bg-red-600 font-bold text-white rounded-full w-44 py-4 px-10'>
                            {listing.type === ListingType.Direct
                                ? 'Offer'
                                : 'Bid'}
                        </button>
                    </div>
                </section>
            </main>
        </div >
    );
}

export default ListingPage;