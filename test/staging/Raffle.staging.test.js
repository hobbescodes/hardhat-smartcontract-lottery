const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

// IN ORDER TO TEST THIS END TO END ON A TESTNET WE NEED TO:
// 1. Get our Subscription ID for the Chainlink VRF
// 2. Deploy our contract using the Subscription ID
// 3. Register the contract with the Chainlink VRF & its Subscription ID
// 4. Register the contract with Chainlink Keepers
// 5. Run the staging tests

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Staging Tests", () => {
          let raffle, raffleEntranceFee, deployer

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              raffle = await ethers.getContract("Raffle", deployer)
              raffleEntranceFee = await raffle.getEntranceFee()
              //   interval = await raffle.getInterval()
          })

          describe("fulfillRandomWords", () => {
              it("works with live Chainlink Keepers and VRF, we get a random winner", async () => {
                  const startingTimestamp = await raffle.getLastTimestamp()
                  const accounts = ethers.getSigners()
                  // set up a listener before we enter the raffle
                  console.log("Setting up listener...")
                  await new Promise(async (resolve, reject) => {
                      // setup listener before we enter the raffle
                      // Just in case the blockchain moves REALLY fast
                      raffle.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired!")
                          try {
                              const recentWinner = await raffle.getRecentWinner()
                              const raffleState = await raffle.getRaffleState()
                              const winnerEndingBalance = await accounts[0].getBalance()
                              const endingTimestamp = await raffle.getLastTimestamp()

                              await expect(raffle.getPlayer(0)).to.be.reverted
                              assert.equal(recentWinner.toString(), accounts[0].address)
                              assert.equal(raffleState, 0)
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString()
                              )
                              assert(endingTimestamp > startingTimestamp)
                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                      })

                      // after listener is set up, we enter the raffle
                      console.log("Entering raffle...")
                      const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                      await tx.wait(1)
                      console.log("Ok, time to wait...")
                      const winnerStartingBalance = await accounts[0].getBalance()
                      // This current block of code WONT complete until our listener has finished listening!
                  })
              })
          })
      })
