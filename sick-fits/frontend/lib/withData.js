import withApollo from 'next-with-apollo'; //high-order compent that will expose apollo client via prop --> w/next
import ApolloClient from 'apollo-boost'; //package put out by Apollo, includes standard things you'd want
import { endpoint } from '../config';

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
  });
}

export default withApollo(createClient);
