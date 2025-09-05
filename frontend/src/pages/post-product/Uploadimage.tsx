import React, { useState } from 'react';
import { Upload } from 'antd';
import type { GetProp, UploadFile, UploadProps } from 'antd';
import ImgCrop from 'antd-img-crop';
import type { RcFile } from 'antd/es/upload';

type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];

interface UploadimageProps {
  onFileSelect: (files: RcFile[]) => void;
}

const Uploadimage: React.FC<UploadimageProps> = ({ onFileSelect }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const onPreview = async (file: UploadFile) => {
    let src = file.url as string;
    if (!src && file.originFileObj) {
      src = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file.originFileObj as FileType);
        reader.onload = () => resolve(reader.result as string);
      });
    }
    const image = new Image();
    image.src = src;
    const imgWindow = window.open(src);
    imgWindow?.document.write(image.outerHTML);
  };

  return (
    <ImgCrop rotationSlider>
      <Upload
        multiple // ✅ อัปโหลดหลายไฟล์
        listType="picture-card"
        fileList={fileList}
        onPreview={onPreview}
        beforeUpload={(file) => {
          const newFileList = [...fileList, {
            uid: file.uid,
            name: file.name,
            status: 'done' as UploadFile['status'],
            url: URL.createObjectURL(file),
            originFileObj: file,
          }];
          setFileList(newFileList);
          onFileSelect(newFileList.map(f => f.originFileObj as RcFile)); // ส่งไฟล์ดิบกลับ
          return false;
        }}
        onRemove={(file) => {
          const updatedList = fileList.filter(f => f.uid !== file.uid);
          setFileList(updatedList);
          onFileSelect(updatedList.map(f => f.originFileObj as RcFile));
        }}
      >
        {fileList.length < 5 && '+ Upload'}
      </Upload>
    </ImgCrop>
  );
};

export default Uploadimage;
