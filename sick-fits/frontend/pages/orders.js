import PleaseSignIn from "../components/PleaseSignIn";
import Order from '../components/Order'
import OrderList from '../components/OrderList'
const OrderPage = props => {
  return (
    <PleaseSignIn>
        <OrderList />
    </PleaseSignIn>
  );
};

export default OrderPage;
