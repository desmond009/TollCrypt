#!/bin/bash

# Update the factory address in environment files
NEW_FACTORY_ADDRESS="0xa0b95eA477EBDe7A658462bf8bD910a6321A04B5"
TOLL_COLLECTION_ADDRESS="0xE5f4743CF4726A7f58E0ccBB5888f1507E5aeF9d"

echo "Updating factory address to: $NEW_FACTORY_ADDRESS"

# Update backend environment if it exists
if [ -f "backend/.env" ]; then
    sed -i.bak "s/TOPUP_WALLET_FACTORY_ADDRESS=.*/TOPUP_WALLET_FACTORY_ADDRESS=$NEW_FACTORY_ADDRESS/" backend/.env
    sed -i.bak "s/TOPUP_TOLL_COLLECTION_CONTRACT_ADDRESS=.*/TOPUP_TOLL_COLLECTION_CONTRACT_ADDRESS=$TOLL_COLLECTION_ADDRESS/" backend/.env
    echo "Updated backend/.env"
fi

# Update frontend environment if it exists
if [ -f "frontend/.env" ]; then
    sed -i.bak "s/REACT_APP_TOPUP_WALLET_FACTORY_ADDRESS=.*/REACT_APP_TOPUP_WALLET_FACTORY_ADDRESS=$NEW_FACTORY_ADDRESS/" frontend/.env
    sed -i.bak "s/REACT_APP_TOPUP_TOLL_COLLECTION_CONTRACT_ADDRESS=.*/REACT_APP_TOPUP_TOLL_COLLECTION_CONTRACT_ADDRESS=$TOLL_COLLECTION_ADDRESS/" frontend/.env
    echo "Updated frontend/.env"
fi

# Update root environment if it exists
if [ -f ".env" ]; then
    sed -i.bak "s/TOPUP_WALLET_FACTORY_ADDRESS=.*/TOPUP_WALLET_FACTORY_ADDRESS=$NEW_FACTORY_ADDRESS/" .env
    sed -i.bak "s/TOPUP_TOLL_COLLECTION_CONTRACT_ADDRESS=.*/TOPUP_TOLL_COLLECTION_CONTRACT_ADDRESS=$TOLL_COLLECTION_ADDRESS/" .env
    echo "Updated .env"
fi

echo "Factory address update complete!"
echo "New Factory Address: $NEW_FACTORY_ADDRESS"
echo "Toll Collection Address: $TOLL_COLLECTION_ADDRESS"
