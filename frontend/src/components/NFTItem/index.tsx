import classes from "./NFTItem.module.css"
import { shortenAddress } from "../../utils/shortenAddress"
import copy from "copy-to-clipboard"
import clsx from "clsx"

import useTokenBalances from "../../hooks/useTokenBalances"
import Loading from "../Loading"
import { useDeployMech } from "../../hooks/useDeployMech"

import { calculateMechAddress } from "../../utils/calculateMechAddress"
import { formatUnits, parseUnits } from "viem"
import { MoralisNFT } from "../../types/Token"
import { getNFTContext } from "../../utils/getNFTContext"
import { AccountNftGrid } from "../NFTGrid"
import NFTMedia from "../NFTMedia"
import { Link } from "react-router-dom"
import React, { ChangeEvent, useEffect, useState } from "react"

import { ethers } from "ethers"
import { makeExecuteTransaction } from "mech-sdk"
import { usePublicClient, useWalletClient } from "wagmi"

type HexedecimalString = `0x${string}`;

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

  const [ERC20TransferTarget, setERC20TransferTarget] = useState<HexedecimalString>(operatorAddress as HexedecimalString)
  const [ERC20TransferAmount, setERC20TransferAmount] = useState("1")
  const [ERC20TransferToken, setERC20TransferToken] = useState<{ address: HexedecimalString, decimals: number }>({
    address: ethers.ZeroAddress as HexedecimalString,
    decimals: 0
  })
  const [isFormValid, setIsFormValid] = useState(false)
  const publicClient = usePublicClient({ chainId })
  const { data: walletClient }
    = useWalletClient({ chainId })

  const handleERC20TransferTokenChange = (
    e: ChangeEvent<HTMLSelectElement>
  ) => {
    const { value: tokenAddress } = e.target
    setERC20TransferToken({
      address: tokenAddress as HexedecimalString,
      decimals: mechErc20Balances.find(b => b.token_address === tokenAddress)?.decimals! || 18
    })
  }

  useEffect(() => {
    const isAddressValid = ethers.isAddress(ERC20TransferTarget)
    const isAmountValid = Number(ERC20TransferAmount) > 0
      && parseUnits(ERC20TransferAmount, ERC20TransferToken.decimals)
      <= Number(mechErc20Balances.find(b => b.token_address === ERC20TransferToken.address)?.balance)
    const isTokenValid = ERC20TransferToken.address.trim() !== "" && ERC20TransferToken.address !== ethers.ZeroAddress

    setIsFormValid(isAddressValid && isAmountValid && isTokenValid && walletClient !== undefined)
  }, [ERC20TransferTarget, ERC20TransferAmount, ERC20TransferToken, walletClient])


  const handleERC20Transfer = async () => {
    // Create the data for the ERC20 transfer
    const ERC20Transfer = new ethers.Interface(["function transfer(address recipient, uint256 amount) public returns (bool)"])
    const erc_data = ERC20Transfer.encodeFunctionData("transfer(address,uint256)", [
      ERC20TransferTarget,
      parseUnits(ERC20TransferAmount, ERC20TransferToken.decimals)
    ])

    const transaction = makeExecuteTransaction(mechAddress, {
      to: ERC20TransferToken.address,
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
          <form onSubmit={handleERC20Transfer}>
            <div>
              <label htmlFor="ERC20TransferTarget">Send to:</label>
              <input
                type="text"
                id="ERC20TransferTarget"
                name="ERC20TransferTarget"
                placeholder="Enter recipient address"
                value={ERC20TransferTarget}
                onChange={e => setERC20TransferTarget(e.target.value as HexedecimalString)}
                required
              />
            </div>
            <div>
              <label htmlFor="ERC20TransferAmount">Amount:</label>
              <input
                type="number"
                id="ERC20TransferAmount"
                name="ERC20TransferAmount"
                placeholder="Enter amount"
                value={ERC20TransferAmount}
                onChange={e => setERC20TransferAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="ERC20TransferToken">Select token:</label>
              <select
                id="ERC20TransferToken"
                name="ERC20TransferToken"
                value={ERC20TransferToken.address}
                onChange={handleERC20TransferTokenChange}
                required
              >
                <option value="">--Please select a token--</option>
                {mechErc20Balances.map((token, index) => (
                  <option key={index} value={token.token_address}>
                    {token.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={handleERC20Transfer} disabled={!isFormValid}>
              Send
            </button>
          </form>
        </ul>
      </div>
      <label>NFTs</label>
      <AccountNftGrid address={mechAddress} />
    </div>
  )
}

export default NFTItem