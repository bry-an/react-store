import withApollo from 'next-with-apollo'; //high-order compent that will expose apollo client via prop --> w/next
import ApolloClient from 'apollo-boost'; //package put out by Apollo, includes standard things you'd want
import { endpoint } from '../config';
import { LOCAL_STATE_QUERY } from '../components/Cart'

function createClient({ headers }) {
  return new ApolloClient({
    uri: process.env.NODE_ENV === 'development' ? endpoint : endpoint,
    request: operation => {
      operation.setContext({
        fetchOptions: {
          credentials: 'include',
        },
        headers,
      });
    },
    //local data
    clientState: {
      resolvers: {
        Mutation: {
          toggleCart(_, variables, { cache }) { //3rd argument is apollo client, destructuring cache from client
            // read the cartOpen value from the cache
            const { cartOpen } = cache.readQuery({
              query: LOCAL_STATE_QUERY
            })
            //write the cart state to opposite
            const data = {
              data: { cartOpen: !cartOpen }
            }
            cache.writeData(data)
            return data
          }
        }
      }, 
      defaults: {
        cartOpen: false,
      }
    }
  });
}

export default withApollo(createClient);
