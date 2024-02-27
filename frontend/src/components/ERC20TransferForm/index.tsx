import React, { ChangeEvent, useState, useEffect } from "react"
import { isAddress, parseUnits } from "viem"
import { useWalletClient } from "wagmi"
import { ethers } from "ethers"

import { MoralisFungible } from "../../types/Token"
import { HexedecimalString } from "../../types/common"

interface ERC20TransferFormProps {
  chainId: number
  operatorAddress: HexedecimalString
  mechAddress: string
  mechErc20Balances: MoralisFungible[]
  handleERC20Transfer: (ERC20TransferToken:  Pick<MoralisFungible, "token_address" | "decimals">, ERC20TransferTarget: HexedecimalString, ERC20TransferAmount: string) => Promise<void>
}

const ERC20TransferForm: React.FC<ERC20TransferFormProps> = ({
                                                               chainId,
                                                               operatorAddress,
                                                               mechAddress,
                                                               mechErc20Balances,
                                                               handleERC20Transfer
                                                             }) => {
  const [ERC20TransferTarget, setERC20TransferTarget] = useState(operatorAddress as HexedecimalString)
  const [ERC20TransferAmount, setERC20TransferAmount] = useState("1")
  const [ERC20TransferToken, setERC20TransferToken] = useState<Pick<MoralisFungible, "token_address" | "decimals">>()
  const [isFormValid, setIsFormValid] = useState(false)

  const { data: walletClient } = useWalletClient({ chainId })

  useEffect(() => {
    const isAddressValid = isAddress(ERC20TransferTarget)
    const isAmountValid = Number(ERC20TransferAmount) > 0 && ERC20TransferToken && parseUnits(ERC20TransferAmount, ERC20TransferToken.decimals) <= Number(mechErc20Balances.find((b) => b.token_address === ERC20TransferToken.token_address)?.balance)
    const isTokenValid = ERC20TransferToken && ERC20TransferToken.token_address.trim() !== "" && ERC20TransferToken.token_address !== ethers.ZeroAddress

    setIsFormValid(!!(isAddressValid && isAmountValid && isTokenValid && walletClient))
  }, [ERC20TransferTarget, ERC20TransferAmount, ERC20TransferToken, walletClient, mechErc20Balances])

  const handleERC20TransferTokenChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const { value: tokenAddress } = e.target
    setERC20TransferToken(mechErc20Balances.find((b) => b.token_address === tokenAddress))
  }

  return (
    <form
      onSubmit={() => ERC20TransferToken && handleERC20Transfer(ERC20TransferToken, ERC20TransferTarget, ERC20TransferAmount)}>
      <div>
        <label htmlFor="ERC20TransferTarget">Send to:</label>
        <input type="text" id="ERC20TransferTarget" name="ERC20TransferTarget" placeholder="Enter recipient address"
               value={ERC20TransferTarget} onChange={(e) => setERC20TransferTarget(e.target.value as HexedecimalString)}
               required />
      </div>
      <div>
        <label htmlFor="ERC20TransferAmount">Amount:</label>
        <input type="number" id="ERC20TransferAmount" name="ERC20TransferAmount" placeholder="Enter amount"
               value={ERC20TransferAmount} onChange={(e) => setERC20TransferAmount(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="ERC20TransferToken">Select token:</label>
        <select id="ERC20TransferToken" name="ERC20TransferToken" value={ERC20TransferToken?.token_address}
                onChange={handleERC20TransferTokenChange} required>
          <option value="">--Please select a token--</option>
          {mechErc20Balances.map((token, index) => (
            <option key={index} value={token.token_address}>
              {token.name}
            </option>
          ))}
        </select>
      </div>
      <button type="button"
              onClick={() => ERC20TransferToken && handleERC20Transfer(ERC20TransferToken, ERC20TransferTarget, ERC20TransferAmount)}
              disabled={!isFormValid}>Send
      </button>
    </form>
  )
}

export default ERC20TransferForm