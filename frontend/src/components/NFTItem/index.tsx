import classes from "./NFTItem.module.css"
import { shortenAddress } from "../../utils/shortenAddress"
import copy from "copy-to-clipboard"
import clsx from "clsx"
import useTokenBalances from "../../hooks/useTokenBalances"
import Loading from "../Loading"
import { useDeployMech } from "../../hooks/useDeployMech"
import { calculateMechAddress } from "../../utils/calculateMechAddress"
import { formatUnits, parseUnits } from "viem"
import { getNFTContext } from "../../utils/getNFTContext"
import { AccountNftGrid } from "../NFTGrid"
import NFTMedia from "../NFTMedia"
import { Link } from "react-router-dom"
import React from "react"
import { MoralisFungible, MoralisNFT } from "../../types/Token"
import { ethers } from "ethers"
import { makeExecuteTransaction } from "mech-sdk"
import { usePublicClient, useWalletClient } from "wagmi"
import ERC20TransferForm from "../ERC20TransferForm"
import { HexedecimalString } from "../../types/common"

interface Props {
  nft: MoralisNFT
  chainId: number
}

const NFTItem: React.FC<Props> = ({ nft, chainId }) => {
  const mechAddress = calculateMechAddress(getNFTContext(nft), chainId)
  const operatorAddress = nft.owner_of

  const {
    data,
    isLoading: mechBalancesLoading,
    error: mechBalancesError
  } = useTokenBalances({
    accountAddress: mechAddress,
    chainId
  })

  const mechNativeBalance = data ? data.native : null
  const mechErc20Balances = data ? data.erc20s : []
  const { deployed } = useDeployMech(getNFTContext(nft), chainId)
  const metadata = JSON.parse(nft.metadata || "{}")
  const name = nft.name || metadata?.name || "..."

  const publicClient = usePublicClient({ chainId })
  const { data: walletClient }
    = useWalletClient({ chainId })


  const handleERC20Transfer = async (ERC20TransferToken: MoralisFungible, ERC20TransferTarget: HexedecimalString, ERC20TransferAmount: string) => {
    // Create the data for the ERC20 transfer
    const ERC20Transfer = new ethers.Interface(["function transfer(address recipient, uint256 amount) public returns (bool)"])
    const erc_data = ERC20Transfer.encodeFunctionData("transfer(address,uint256)", [
      ERC20TransferTarget,
      parseUnits(ERC20TransferAmount, ERC20TransferToken.decimals)
    ])

    const transaction = makeExecuteTransaction(mechAddress, {
      to: ERC20TransferToken.token_address as HexedecimalString,
      data: erc_data as HexedecimalString
    })

    try {
      if (!walletClient) {
        console.error("Wallet client not initialized!")
        return
      }
      const hash = await walletClient.sendTransaction(transaction)
      console.log("Transaction sent:", hash)

      // Wait for the transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      console.log("Transaction confirmed:", receipt.transactionHash)

    } catch (error) {
      console.error("Error executing transaction:", error)
    }
  }

  return (
    <div className={classes.itemContainer}>
      <div className={classes.header}>
        <Link
          to={`/collection/${nft.token_address}`}
          className={classes.tokenName}
        >
          <p>{name}</p>
        </Link>

        <p className={classes.tokenId} title={nft.token_id}>
          {nft.token_id}
        </p>
      </div>
      <div className={classes.main}>
        <NFTMedia nft={nft} />

        <ul className={classes.info}>
          <li>
            <label>Status</label>
            <div className={classes.infoItem}>
              <div
                className={clsx(
                  classes.indicator,
                  deployed && classes.deployed
                )}
              />
              {deployed ? "Deployed" : "Not Deployed"}
            </div>
          </li>
          <li>
            <label>Mech</label>
            <div
              className={clsx(classes.infoItem, classes.address)}
              onClick={() => copy(mechAddress)}
              title={mechAddress}
            >
              {shortenAddress(mechAddress, 6)}
            </div>
          </li>
          <li>
            <label>Operator</label>
            <div
              className={clsx(classes.infoItem, {
                [classes.address]: !!operatorAddress
              })}
              onClick={
                operatorAddress ? () => copy(operatorAddress) : undefined
              }
              title={operatorAddress}
            >
              <div className={classes.ellipsis}>
                {operatorAddress
                  ? shortenAddress(operatorAddress, 6)
                  : "\u2014"}
              </div>
            </div>
          </li>
        </ul>
      </div>
      <label>Inventory</label>
      <div className={clsx(classes.assetsContainer)}>
        {mechBalancesError && <p>Failed to load assets</p>}
        {mechBalancesLoading && <Loading />}
        <ul className={classes.assetList}>
          {!mechBalancesLoading && !mechBalancesError && mechNativeBalance && (
            <li className={classes.asset}>
              <div>{mechNativeBalance.name}</div>
              <div className={classes.value}>
                <p>
                  {formatUnits(
                    BigInt(mechNativeBalance.balance),
                    mechNativeBalance.decimals || 0
                  )}
                </p>
                <p>{mechNativeBalance.symbol}</p>
              </div>
            </li>
          )}
          {mechErc20Balances.map((balance, index) => (
            <li key={index} className={classes.asset}>
              <div className={classes.assetName}>
                <img src={balance.logo} alt={`logo for ${balance.name}`} />
                <div>{balance.name}</div>
              </div>
              <div className={classes.value}>
                <p>
                  {formatUnits(BigInt(balance.balance), balance.decimals || 0)}
                </p>
                <p>{balance.symbol}</p>
              </div>
            </li>
          ))}
          <ERC20TransferForm chainId={chainId}
                             operatorAddress={operatorAddress as HexedecimalString}
                             mechAddress={mechAddress} mechErc20Balances={mechErc20Balances}
                             handleERC20Transfer={handleERC20Transfer}/>
        </ul>
      </div>
      <label>NFTs</label>
      <AccountNftGrid address={mechAddress} />
    </div>
  )
}

export default NFTItem