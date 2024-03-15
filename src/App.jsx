import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  Image,
  Input,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import { Alchemy, Network, Utils } from "alchemy-sdk";
import { ethers } from "ethers";
import { useEffect, useState } from "react";
import classes from "./App.module.css";

function App() {
  const [userAddress, setUserAddress] = useState("");
  const [results, setResults] = useState([]);
  const [hasQueried, setHasQueried] = useState(false);
  const [queries, setQueries] = useState({});
  const [tokenDataObjects, setTokenDataObjects] = useState([]);
  const [alchemy, setAlchemy] = useState();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAlchemy(new Alchemy({
      apiKey: import.meta.env.VITE_ALCHEMY_API_KEY_SEPOLIA,
      network: Network.ETH_SEPOLIA
    }));
  }, []);

  useEffect(() => {
    async function connectWallet() {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      if (address && alchemy) {
        setUserAddress(address);
        await getTokenBalance(address);
      }
    }
    connectWallet();
  }, [alchemy]);

  async function handleCachedQuery(address) {
    setUserAddress(address);
    await getTokenBalance(address);
  }

  async function getTokenBalance(address) {
    const _address = address || userAddress;
    const cachedQuery = queries[_address];

    if (!_address) {
      setHasQueried(false);
      return;
    }
    else if (cachedQuery) {
      setResults(cachedQuery.data);
      setTokenDataObjects(cachedQuery.tokenDataObjects);
      setHasQueried(true);
      return;
    }

    setLoading(true);
    try {
      const data = await alchemy.core.getTokenBalances(_address);
      setResults(data);

      const tokenDataPromises = [];
      for (let i = 0; i < data.tokenBalances.length; i++) {
        const tokenData = alchemy.core.getTokenMetadata(
          data.tokenBalances[i].contractAddress
        );
        tokenDataPromises.push(tokenData);
      }

      const tokenDataObjects = await Promise.all(tokenDataPromises);

      setQueries(queries => ({
        [_address]: {
          data,
          tokenDataObjects,
        },
        ...queries
      }));
      setTokenDataObjects(tokenDataObjects);
      setHasQueried(true);
    }
    catch (error) {
      console.log(error);
      alert("Failed to check ERC-20 token balances.");
    }
    setLoading(false);
  }
  return (
    <Box w="100vw">
      <Center>
        <Flex
          alignItems={"center"}
          justifyContent="center"
          flexDirection={"column"}
        >
          <Heading mb={0} fontSize={36}>
            ERC-20 Token Indexer
          </Heading>
          <Text>
            Plug in an address and this website will return all of its ERC-20
            token balances!
          </Text>
        </Flex>
      </Center>
      <Flex
        w="100%"
        flexDirection="column"
        alignItems="center"
        justifyContent={"center"}
      >
        <Heading mt={42}>
          Get all the ERC-20 token balances of this address:
        </Heading>
        <Input
          className={classes.input}
          onChange={(e) => setUserAddress(e.target.value)}
          value={userAddress}
          maxLength={42}
          autoFocus
        />
        <Button className={classes.button} onClick={() => getTokenBalance()} mt={36}
          isDisabled={loading}>
          {loading
            ? "Loading..."
            : "Check ERC-20 Token Balances"
          }
        </Button>

        <Heading my={36}>ERC-20 token balances:</Heading>

        {hasQueried ? (
          <SimpleGrid w={"90vw"} columns={4} spacing={20}>
            {results.tokenBalances.map((e, i) => {
              const balance = Utils.formatUnits(
                e.tokenBalance,
                tokenDataObjects[i].decimals
              );
              return (
                <Flex
                  className={classes.gridItem}
                  flexDir={"column"}
                  key={`${e.id}-${i}`}
                >
                  <Box>
                    <b>Symbol:</b> ${tokenDataObjects[i].symbol}&nbsp;
                  </Box>
                  <Box className={classes.gridItemText} title={balance}>
                    <b>Balance:</b>&nbsp;
                    {Utils.formatUnits(
                      e.tokenBalance,
                      tokenDataObjects[i].decimals
                    )}
                  </Box>
                  <Image src={tokenDataObjects[i].logo} />
                </Flex>
              );
            })}
          </SimpleGrid>
        ) : (
          "Please make a query! This may take a few seconds..."
        )}

        <Heading my={36}>Recent queries:</Heading>
        <Flex direction={"column"}>
          {Object.keys(queries).map(address => (
            <a key={address} onClick={() => handleCachedQuery(address)}>{address}</a>
          ))}
        </Flex>
      </Flex>
    </Box>
  );
}

export default App;
