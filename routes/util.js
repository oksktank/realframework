/**
 * Created with JetBrains WebStorm.
 * User: ihansol
 * Date: 12. 11. 24.
 * Time: 오후 7:59
 * To change this template use File | Settings | File Templates.
 */
exports.contains=function(array,str){
    for(var i=0; i<array.length;i++){
        if(array[i]==str){
            return true;
        }
    }
    return false;
}