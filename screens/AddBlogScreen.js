import {View, Text, StyleSheet} from 'react-native';
import BottomBar from '../components/BottomBar';

export default function AddBlogScreen(){
    return(
        <>
        <View style={styles.container}>
            <Text style={styles.text}>Hello</Text>
        </View>
        <BottomBar />
        </>
    );
}

const styles = StyleSheet.create({
    container:{
        flex:1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000000"
    },
    text:{
        color: "white",
    }
});