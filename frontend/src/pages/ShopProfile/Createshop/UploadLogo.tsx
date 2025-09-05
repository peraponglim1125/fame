import React, { useState } from 'react';
import { Upload } from 'antd';
import ImgCrop from 'antd-img-crop';
import type { RcFile, UploadFile } from 'antd/es/upload';

interface UploadLogoProps {
  onFileChange: (file: RcFile | null) => void;
}

const UploadLogo: React.FC<UploadLogoProps> = ({ onFileChange }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const getBase64 = (file: RcFile): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  const onPreview = async (file: UploadFile) => {
    let src = file.url || file.thumbUrl!;
    if (!src && file.originFileObj) {
      src = await getBase64(file.originFileObj as RcFile);
    }
    const image = new Image();
    image.src = src;
    const imgWindow = window.open(src);
    imgWindow?.document.write(image.outerHTML);
  };

  return (
    <ImgCrop rotationSlider>
      <Upload
        listType="picture-card"
        fileList={fileList}
        beforeUpload={async (file) => {
          const preview = await getBase64(file); // แปลงเป็น base64
          const newFile: UploadFile = {
            uid: file.uid,
            name: file.name,
            status: 'done',
            originFileObj: file,
            thumbUrl: preview, // ❗ ใส่ภาพให้แสดง
          };
          setFileList([newFile]);
          onFileChange(file);
          return false;
        }}
        onPreview={onPreview}
        onRemove={() => {
          setFileList([]);
          onFileChange(null);
        }}
      >
        {fileList.length === 0 && '+ Upload'}
      </Upload>
    </ImgCrop>
  );
};

export default UploadLogo;
