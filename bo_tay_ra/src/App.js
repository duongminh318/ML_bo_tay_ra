
import React,{useEffect,useRef,useState} from 'react';//thư viện sử dụng camera
import { initNotifications, notify } from '@mycv/f8-notification';  //thư viện thông báo
import './App.css';
import * as mobilenet from '@tensorflow-models/mobilenet' 
import * as knnClassifier from '@tensorflow-models/knn-classifier'
import {Howl, Howler} from 'howler';    // thư viện nhạc, để sử dụng âm thanh
import soundURL from './assets/hey_sondn.mp3'; // import file âm thanh
const tf = require('@tensorflow/tfjs');

//const mobilenetModule = require('@tensorflow-models/mobilenet');
//const knnClassifier = require('@tensorflow-models/knn-classifier');


var sound = new Howl({    // phương thức phát nhạc (play mp3)
  src: [soundURL]   
});

//sound.play();

const NOT_TOUCH_LABEL='not_touch';    //constants biến hằng
const TOUCHED_LABEL="touched"; // nhãn khi chạm tay
const TRAINING_TIMES=50; // số lần training
const TOUCHED_CONFIDENCE=0.8; // độ tin cậy 80%


function App() {
  const video=useRef(); //hằng video thuộc useRef
  const classifier=useRef();  // useRef lưu trữ || sử dụng với DOM
  const canPlaySound=useRef(true);    
  const mobilenetModule=useRef();
  const [touched, setTouched]= useState(null);
  
  
  const init =async() =>{   //hàm init setup camera
    console.log('init...');
    await setupCamera();  //gọi hàm setupcam đã build bên dưới

    console.log('setup Camera success');

    classifier.current = knnClassifier.create();    // lưu trữ dạng biến

    mobilenetModule.current = await mobilenet.load();
    // tạo và load các hàm thuộc các thư viện
    console.log('setup done');
    console.log('không bỏ tay lên mặt và bấm train 1');
    initNotifications({ cooldown: 3000 });
  }

  const setupCamera =() =>{
    return new Promise ((resolve,reject)=>{  //xin quyền truy cập vào camera băng api navi..
      navigator.getUserMedia=navigator.getUserMedia||
      navigator.WebkitGetUserMedia||
      navigator.mozgetUserMedia||
      navigator.msgetUserMedia;
      //get video từ webcame trên các trình duyệt khác nhau
      if(navigator.getUserMedia){
        navigator.getUserMedia( 
          {video:true}, 
          stream=>{
              video.current.srcObject=stream;   //succes callback
              video.current.addEventListener('loadeddata',resolve) //gọi lại khi stream thành công
          },
          error=>reject(error) //error callback
        );
      }else {
        reject();
      }

    });
  }

  const train=async label=>{  // thông báo khi đang train
    console.log(`[${label}] Đang train cho máy mặt đẹp trai của bạn....`);
    for(let i=0;i<TRAINING_TIMES;++i)
    {
      console.log(`Progess ${parseInt((i+1)/TRAINING_TIMES*100)}%`) // hiển thị phần trăm progess
      await training(label);    // gọi hàm training
    }

  }


  /**
   * bước 1:Train cho máy khuôn mặt không chạm tay
   * bước 2:Train cho máy khuôn mặt đã chạm tay
   * bươc 3:lấy hình ảnh hiện tai,phân tích và so sánh với data đã học trước đó
   * nếu matching với khuôn mặt chạm tay => cảnh báo
   * @param {} label 
   * @returns 
   */

  const training = label => {    //hàm học
    
    return new Promise(async resolve => {
      const embedding = mobilenetModule.current.infer(
        video.current,  //lấy dữ liệu trả về từ video 
        true
      );
      // đưa dl vào cls xử lý (học)
      classifier.current.addExample(embedding, label);
      await sleep(100); // học 50 lần trong 5s=> mỗi lần đợi 100ms
      resolve();
      });
  }


  const run= async () => {
    const embedding = mobilenetModule.current.infer(
      video.current,
      true
      // lấy kết quả hình ảnh trả về từ mobilenet sau đó đưa vào cls xử lý
    );
    const result = await classifier.current.predictClass(embedding);
      // lấy kết quả trả về từ KNN classifier
    await sleep(200);
    run();

    if(result.label===TOUCHED_LABEL &&  //khi trả nhãn đã trạm tay và độ tin cậy lớn hơn 0.8
      result.confidences[result.label]>TOUCHED_CONFIDENCE
      ){
        console.log('Touched');
        if(canPlaySound.current){   // cảnh báo
          sound.play();
          canPlaySound.current=false; // sau khi cảnh báo xong gán bằng false(tránh lặp lại nhiều lần)
        }
        setTouched(true);
        
        notify('Bỏ Tay Ra!!', { body: 'Bạn Vừa Chạm Tay Lên Mặt Kìa !!?.' });// đưa ra thông báo trên trình duyệt
    }else{
      console.log('Not Touch');
      setTouched(false);
    }

  }


  const sleep=(ms= 0)=>{    // hàm ngủ(đợi)
    return new Promise(resolve =>setTimeout(resolve, ms))
  }

  useEffect(()=>{
    init();
    sound.on('end', function(){
      canPlaySound.current=true; // kết thúc mở lại cảnh bào true
    });

     //cleanup
     return()=>{   }
  

  }, []);


  return (
    <div className={`main ${touched ?'touched':''}`}>
        <video
          ref={video}
          className="video"
          autoPlay
        />

      <div className="control">
        <button className="btn" onClick={() => train(NOT_TOUCH_LABEL)}>Train 1 </button>
        <button className="btn" onClick={() => train(TOUCHED_LABEL)}>Train 2 </button>
        <button className="btn" onClick={() => run()}>Run </button>
      </div>

    </div>
  );
}

export default App;
